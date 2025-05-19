import { useState, useEffect, useRef } from 'react';
import { setMockDate, resetMockDate, getCurrentDate, formatDate, formatInputDate, isInTestMode, parseDate } from '../../utils/dateUtils';
import { isValid, parseISO } from 'date-fns';
import { Minimize2, Maximize2, Database, RotateCcw, Trash2 } from 'lucide-react';
// Zamijenjeno prema novoj modularnoj API strukturi
import api from '../../utils/api/apiConfig';
import { cleanupTestData } from '../../utils/api/apiMisc';

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
  
  // Tipizacija backup objekta
  interface DateBackup {
    filename: string;
    timestamp: string;
    created: string;
    size: number;
    backupCreated?: boolean;
    message?: string;
  }
  
  // Stanje za backup/restore funkcionalnost
  const [showBackups, setShowBackups] = useState<boolean>(false);
  const [backups, setBackups] = useState<DateBackup[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);

  // Efekt koji ažurira prikaz trenutnog aplikacijskog datuma
  useEffect(() => {
    // Postavi inicijalno stanje
    const checkDate = () => {
      const appDate = getCurrentDate();
      setCurrentApplicationDate(appDate);
      
      // Provjeri je li mock aktivan
      setIsMockActive(appDate.getTime() !== getCurrentDate().getTime());
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
    void refreshMembershipStatus();
    
    alert(`Simulirani datum je postavljen na: ${formatDate(date)}`);
  };

  const handleResetDate = () => {
    // Resetiraj mock datum
    resetMockDate();
    
    // Ažuriraj stanje
    const realDate = getCurrentDate();
    setDate(realDate);
    setCurrentApplicationDate(realDate);
    setIsMockActive(false);
    
    // Pozovi backend endpoint za rekalkulaciju statusa članstva
    void refreshMembershipStatus();
    
    alert('Simulacija datuma je isključena. Koristi se stvarni sustavni datum.');
  };
  
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  // Funkcija za dohvaćanje dostupnih backupa
  // Tipizacija API odgovora
  interface BackupsResponse {
    backups: DateBackup[];
  }

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const response = await api.get<BackupsResponse>('debug/list-backups');
      // Sada TypeScript zna da response.data.backups je DateBackup[]
      setBackups(response.data.backups ?? []);
      setShowBackups(true);
    } catch (error) {
      console.error('Greška prilikom dohvaćanja backupa:', error);
      const errorMsg = error instanceof Error ? error.message : 'Greška pri dohvaćanju backupa';
      alert(errorMsg);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Funkcija za vraćanje podataka iz odabranog backupa
  const restoreFromBackup = async (filename: string) => {
    if (window.confirm(`Jeste li sigurni da želite vratiti podatke iz backupa: ${filename}?`)) {
      try {
        interface RestoreResponse {
          message: string;
        }
        const response = await api.post<RestoreResponse>(`debug/restore-from-backup/${filename}`);
        alert(`Uspješno! Podaci su vraćeni iz backupa. ${response.data.message ?? ''}`);
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
        
        // Tipizacija za odgovor resetiranja baze
        interface ResetDatabaseResponse {
          backupCreated: boolean;
          message: string;
        }
        
        // Pozovi backend endpoint za reset baze
        const response = await api.post<ResetDatabaseResponse>('debug/reset-test-database');
        
        // Također resetiraj i mock datum
        resetMockDate();
        
        // Ažuriraj stanje
        const realDate = getCurrentDate();
        setDate(realDate);
        setCurrentApplicationDate(realDate);
        setIsMockActive(false);
        
        // Obavijesti korisnika
        alert(`✅ Testno okruženje uspješno resetirano!\n\n` +
              `Baza podataka je vraćena na početno stanje.\n` +
              `Koristi se stvarni sistemski datum.\n\n` +
              `${response.data.backupCreated ? '✓ Backup je uspješno kreiran.' : '❌ Backup nije kreiran.'}\n` +
              `${response.data.message ?? ''}`);

        // Osvježi listu backupa ako je otvorena
        if (showBackups) {
          void fetchBackups();
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
    const inputDate = parseDate(event.target.value);
    // Eksplicitna provjera da inputDate nije null i da je validan datum
    if (inputDate !== null && isValid(inputDate)) {
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
      // Dohvati trenutni datum (pravi ili mock) za slanje na backend
      const currentDate = getCurrentDate();
      
      // Pozovi backend endpoint bez /api/ prefiksa jer axios klijent već dodaje taj prefiks
      // Dodajemo simulirani datum kao parametar
      await api.post('debug/recalculate-membership', {
        mockDate: formatDate(currentDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
      });
      
      console.log(`Refreshed membership status based on date: ${formatDate(currentDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')}`);
    } catch (error) {
      console.error('Error refreshing membership status:', error);
    }
  };

  // Funkcija za čišćenje testnih podataka
  const handleCleanupTestData = async () => {
    if (window.confirm('Jeste li sigurni da želite očistiti sve testne podatke?\n\n' + 
                       'Svi zapisi razdoblja članstva kreirani tijekom testiranja s mock datumom\n' +
                       'bit će uklonjeni, a statusi članstva ažurirani na temelju preostalih podataka.\n\n' + 
                       'Nastaviti?')) {
      try {
        // Prikaži indikator učitavanja
        const cleanupButton = document.getElementById('cleanup-test-data-button') as HTMLButtonElement;
        if (cleanupButton) {
          cleanupButton.textContent = 'Čišćenje...';
          cleanupButton.disabled = true;
        }
        
        // Pozovi funkciju za čišćenje testnih podataka
        const result = await cleanupTestData();
        
        // Obavijesti korisnika
        alert(`✅ Testni podaci uspješno očišćeni!\n\n` +
              `Uklonjeno je ${result.details.deletedRecords} zapisa.\n` +
              `Ažurirano je ${result.details.affectedMembers} članova.\n\n` +
              `${result.message}`);

      } catch (error) {
        console.error('Greška prilikom čišćenja testnih podataka:', error);
        alert('❌ Greška prilikom čišćenja testnih podataka. Provjerite konzolu za više detalja.');
      } finally {
        // Vrati gumb u normalno stanje
        const cleanupButton = document.getElementById('cleanup-test-data-button') as HTMLButtonElement;
        if (cleanupButton) {
          cleanupButton.textContent = 'Očisti testne podatke';
          cleanupButton.disabled = false;
        }
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed ${isMinimized ? 'w-60' : 'w-80'} bg-white border border-gray-300 rounded-lg shadow-lg z-50 overflow-hidden`}
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
        transition: isDragging ? 'none' : 'height 0.3s ease-in-out'
      }}
    >
      {/* Zaglavlje s kontrolama */}
      <div 
        className="bg-blue-600 text-white px-3 py-2 flex justify-between items-center cursor-move"
        onMouseDown={handleMouseDown}
      >
        <span className="font-medium flex items-center">
          <span className={`mr-1 ${isMockActive ? 'text-yellow-300' : 'text-white'}`}>
            {isMockActive ? '⚠️' : '📅'}
          </span>
          {isMinimized ? 'Mock datum' : 'Simulacija datuma'}
        </span>
        <div className="flex space-x-1">
          <button 
            onClick={() => setShowBackups(!showBackups)} 
            className="text-white hover:bg-blue-700 p-1 rounded"
            title="Backup/Restore"
          >
            <Database size={16} />
          </button>
          <button 
            onClick={toggleMinimized} 
            className="text-white hover:bg-blue-700 p-1 rounded"
            title={isMinimized ? 'Proširi' : 'Smanji'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
        </div>
      </div>
      
      {/* Tijelo s formom i akcijama */}
      {!isMinimized && (
        <div className="p-3">
          <div className="mb-3">
            <div className="text-sm font-medium mb-1">Trenutni datum aplikacije:</div>
            <div className={`text-lg ${isMockActive ? 'text-orange-600 font-bold' : 'text-green-600'}`}>
              {formatDate(currentApplicationDate)}
              {isMockActive && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded">SIMULACIJA</span>}
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Postavi simulirani datum:</label>
            <input 
              type="date" 
              value={formatInputDate(date)}
              onChange={handleDateChange}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            />
          </div>
          
          <div className="flex space-x-2 mb-3">
            <button 
              onClick={handleSetMockDate}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
            >
              Postavi datum
            </button>
            <button 
              onClick={handleResetDate}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Resetiraj
            </button>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <button 
              id="reset-db-button"
              onClick={() => { void handleFullReset(); }}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm mb-2"
            >
              <div className="flex items-center justify-center">
                <RotateCcw size={14} className="mr-1" /> 
                Potpuni reset
              </div>
            </button>
            
            <button 
              id="cleanup-test-data-button"
              onClick={() => { void handleCleanupTestData(); }}
              className={`w-full ${isInTestMode() ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-400'} text-white py-1 px-3 rounded text-sm`}
              disabled={!isInTestMode()}
              title={isInTestMode() ? 'Očisti testne podatke iz baze' : 'Opcija je dostupna samo tijekom testiranja s mock datumom'}
            >
              <div className="flex items-center justify-center">
                <Trash2 size={14} className="mr-1" /> 
                Očisti testne podatke
              </div>
            </button>
          </div>
          
          {/* Backup/Restore panel */}
          {showBackups && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Upravljanje backupovima:</h4>
                <button
                  onClick={() => { void fetchBackups(); }}
                  className="bg-purple-500 hover:bg-purple-600 text-white py-1 px-2 rounded text-xs flex items-center gap-1"
                  disabled={loadingBackups}
                >
                  <RotateCcw size={12} className={loadingBackups ? "animate-spin" : ""} />
                  {loadingBackups ? "Učitavanje..." : "Dohvati backupe"}
                </button>
              </div>
              
              {backups.length > 0 && (
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
                            onClick={() => { void restoreFromBackup(backup.filename); }}
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
              
              {backups.length === 0 && (
                <div className="mt-2 text-gray-500 text-xs">
                  Nema dostupnih backupa.
                </div>
              )}
            </div>
          )}
          
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