import { useState, useEffect, useRef } from 'react';
import { setMockDate, resetMockDate, getCurrentDate, formatDate, formatInputDate } from '../../utils/dateUtils';
import { format, isValid } from 'date-fns';
import { Minimize2, Maximize2, Move } from 'lucide-react';

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
    
    alert('Simulacija datuma je isključena. Koristi se stvarni sustavni datum.');
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

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
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
          
          <div className="flex space-x-2">
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