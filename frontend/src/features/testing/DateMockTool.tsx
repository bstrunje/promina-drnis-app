import { useState, useEffect, useRef } from 'react';
import { setMockDate, resetMockDate, restoreOriginalMock, getCurrentDate, formatDate, formatInputDate } from '../../utils/dateUtils';
import { format, isValid, parseISO } from 'date-fns';
import { Minimize2, Maximize2, Move, Database, RotateCcw } from 'lucide-react';
import api from '../../utils/api';

/**
 * Komponenta za postavljanje mock datuma za testiranje funkcionalnosti vezanih za datum
 * Vidljiva samo u development okruženju
 */
const DateMockTool = () => {
  const [date, setDate] = useState<Date>(getCurrentDate());
  const [currentApplicationDate, setCurrentApplicationDate] = useState<Date>(getCurrentDate());
  const [isMockActive, setIsMockActive] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Stanje za backup/restore funkcionalnost
  const [showBackups, setShowBackups] = useState<boolean>(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);

  // Efekt koji ažurira prikaz trenutnog aplikacijskog datuma
  useEffect(() => {
    // Postavi inicijalno stanje
    const checkDate = () => {
      const appDate = getCurrentDate();
      setCurrentApplicationDate(appDate);
      
      // Provjeri je li mock aktivan
      setIsMockActive(appDate.getTime() !== new Date().getTime());
    };
    
    // Provjeri odmah na početku
    checkDate();
    
    // Postavi interval za redovite provjere
    const interval = setInterval(checkDate, 1000);
    
    // Očisti interval pri unmount-u
    return () => clearInterval(interval);
  }, []);

  // Efekt za upravljanje drag-and-drop
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleSetMockDate = () => {
    if (!isValid(date)) {
      alert('Odabrani datum nije valjan!');
      return;
    }
    
    // Postavi mock datum
    setMockDate(date);
    
    // Ažuriraj stanje
    setCurrentApplicationDate(date);
    setIsMockActive(true);
    
    // Pozovi backend endpoint za rekalkulaciju statusa članstva
    refreshMembershipStatus();
    
    alert(`Simulirani datum je postavljen na: ${formatDate(date)}`);
  };

  const handleResetDate = () => {
    // Resetiraj mock datum
    resetMockDate();
    
    // Ažuriraj stanje
    const realDate = new Date();
    setDate(realDate);
    setCurrentApplicationDate(realDate);
    setIsMockActive(false);
    
    // Pozovi backend endpoint za rekalkulaciju statusa članstva
    refreshMembershipStatus();
    
    alert('Simulacija datuma je isključena. Koristi se stvarni sustavni datum.');
  };
  
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  // Funkcija za dohvaćanje dostupnih backupa
  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const response = await api.get('debug/list-backups');
      setBackups(response.data.backups || []);
      setShowBackups(true);
    } catch (error) {
      console.error('Greška prilikom dohvaćanja backupa:', error);
      alert('Greška prilikom dohvaćanja backupa. Provjerite konzolu za više detalja.');
    } finally {
      setLoadingBackups(false);
    }
  };

  // Funkcija za vraćanje podataka iz odabranog backupa
  const restoreFromBackup = async (filename: string) => {
    if (window.confirm(`Jeste li sigurni da želite vratiti podatke iz backupa: ${filename}?`)) {
      try {
        const response = await api.post(`debug/restore-from-backup/${filename}`);
        alert(`Uspješno! Podaci su vraćeni iz backupa. ${response.data.message}`);
        // Refresh nakon vraćanja backupa
        window.location.reload();
      } catch (error) {
        console.error('Greška prilikom vraćanja backupa:', error);
        alert('Greška prilikom vraćanja backupa. Provjerite konzolu za više detalja.');
      }
    }
  };

  // Proširena funkcija za potpuni reset - uključuje i bazu i datume
  const handleFullReset = async () => {
    if (window.confirm('Ovo će potpuno resetirati testno okruženje:\n\n' + 
                      '- Resetirati testnu bazu podataka\n' + 
                      '- Vratiti stvarni sistemski datum\n' + 
                      '- Automatski napraviti backup prije resetiranja\n\n' + 
                      'Sve promjene nastale tijekom testiranja bit će izgubljene. Nastaviti?')) {
      try {
        // Prikaži indikator učitavanja
        const resetButton = document.getElementById('reset-db-button') as HTMLButtonElement;
        if (resetButton) {
          resetButton.textContent = 'Resetiranje...';
          resetButton.disabled = true;
        }
        
        // Pozovi backend endpoint za reset baze
        const response = await api.post('debug/reset-test-database');
        
        // Također resetiraj i mock datum
        resetMockDate();
        
        // Ažuriraj stanje
        const realDate = new Date();
        setDate(realDate);
        setCurrentApplicationDate(realDate);
        setIsMockActive(false);
        
        // Obavijesti korisnika
        alert(`✅ Testno okruženje uspješno resetirano!\n\n` +
              `Baza podataka je vraćena na početno stanje.\n` +
              `Koristi se stvarni sistemski datum.\n\n` +
              `${response.data.backupCreated ? '✓ Backup je uspješno kreiran.' : '❌ Backup nije kreiran.'}\n` +
              `${response.data.message}`);

        // Osvježi listu backupa ako je otvorena
        if (showBackups) {
          fetchBackups();
        }
      } catch (error) {
        console.error('Greška prilikom resetiranja testne baze:', error);
        alert('❌ Greška prilikom resetiranja testne baze. Provjerite konzolu za više detalja.');
      } finally {
        // Vrati gumb u normalno stanje
        const resetButton = document.getElementById('reset-db-button') as HTMLButtonElement;
        if (resetButton) {
          resetButton.textContent = 'Potpuni reset';
          resetButton.disabled = false;
        }
      }
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputDate = new Date(event.target.value);
    if (isValid(inputDate)) {
      setDate(inputDate);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Nova funkcija za rekalkulaciju statusa članstva
  const refreshMembershipStatus = async () => {
    try {
      // Pozovi backend endpoint bez /api/ prefiksa jer axios klijent već dodaje taj prefiks
      await api.post('debug/recalculate-membership');
      console.log('Refreshed membership status based on new date');
    } catch (error) {
      console.error('Error refreshing membership status:', error);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 9999,
        maxWidth: isMinimized ? '200px' : '400px',
        width: isMinimized ? 'auto' : '100%'
      }}
      className={`rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
        isMockActive ? 'bg-amber-50 border border-amber-300' : 'bg-white border'
      }`}
    >
      <div 
        className={`p-2 flex justify-between items-center ${
          isMockActive ? 'bg-amber-100' : 'bg-gray-100'
        } cursor-move`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move size={16} className="text-gray-500" />
          <h3 className="text-sm font-medium">
            {isMinimized ? 'Date Mock' : 'Test alat - Mock datum'}
          </h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleMinimized} 
            className="p-1 rounded hover:bg-gray-200"
            title={isMinimized ? "Proširi" : "Smanji"}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-4">
          <div className="mb-4">
            <p className="text-base font-medium mb-1">Trenutni datum u aplikaciji:</p>
            <div className={`text-lg font-bold ${isMockActive ? 'text-amber-600' : 'text-green-600'}`}>
              {formatDate(currentApplicationDate)}
              {isMockActive && <span className="ml-2 text-xs bg-amber-200 px-1 py-0.5 rounded">Mock</span>}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm mb-1">Odaberi simulirani datum:</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={formatInputDate(date)}
              onChange={handleDateChange}
            />
          </div>
          
          <div className="flex space-x-2 flex-wrap gap-2">
            <button
              onClick={handleSetMockDate}
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
            >
              Postavi mock datum
            </button>
            
            <button
              onClick={handleResetDate}
              className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Resetiraj
            </button>
            
            <button
              onClick={() => {
                const restored = restoreOriginalMock();
                if (restored) {
                  // Ažuriraj stanje s originalnim mock datumom
                  const originalDate = getCurrentDate();
                  setDate(originalDate);
                  setCurrentApplicationDate(originalDate);
                  setIsMockActive(true);
                  alert(`Vraćen prethodni mock datum: ${formatDate(originalDate)}`);
                } else {
                  alert('Nema spremljenog prethodnog mock datuma.');
                }
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white py-1 px-3 rounded text-sm"
              title="Vrati na prethodni mock datum"
            >
              Vrati prethodni
            </button>
          </div>
          
          <div className="mt-2">
            <button
              id="reset-db-button"
              onClick={handleFullReset}
              className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm flex items-center gap-1"
            >
              <Database size={14} />
              Potpuni reset
            </button>
          </div>
          
          <div className="mt-4 border-t pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Upravljanje backupovima:</h4>
              <button
                onClick={fetchBackups}
                className="bg-purple-500 hover:bg-purple-600 text-white py-1 px-2 rounded text-xs flex items-center gap-1"
                disabled={loadingBackups}
              >
                <RotateCcw size={12} className={loadingBackups ? "animate-spin" : ""} />
                {loadingBackups ? "Učitavanje..." : "Dohvati backupe"}
              </button>
            </div>
            
            {showBackups && backups.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto border rounded p-2">
                <ul className="divide-y">
                  {backups.map((backup, index) => (
                    <li key={index} className="py-1 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{backup.filename}</div>
                          <div className="text-gray-500">
                            {backup.timestamp 
                              ? `Datum: ${formatDate(parseISO(backup.timestamp))}`
                              : `Datum: ${formatDate(backup.created)}`
                            }
                          </div>
                          <div className="text-gray-500">
                            Veličina: {Math.round(backup.size / 1024)} KB
                          </div>
                        </div>
                        <button
                          onClick={() => restoreFromBackup(backup.filename)}
                          className="bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-xs"
                        >
                          Vrati backup
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {showBackups && backups.length === 0 && (
              <div className="mt-2 text-gray-500 text-xs">
                Nema dostupnih backupa.
              </div>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Napomena: Ovaj alat omogućuje testiranje funkcionalnosti vezanih za datum (npr. kraj godine)</p>
            <p className="font-bold mt-1">Samo za razvojno okruženje!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateMockTool;