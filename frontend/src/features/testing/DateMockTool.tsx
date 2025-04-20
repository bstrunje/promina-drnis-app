import { useState } from 'react';
import { setMockDate, resetMockDate, getCurrentDate, formatDate, formatInputDate } from '../../utils/dateUtils';
import { format } from 'date-fns';

/**
 * Komponenta za postavljanje mock datuma za testiranje funkcionalnosti vezanih za datum
 * Vidljiva samo u development okruženju
 */
const DateMockTool = () => {
  const [date, setDate] = useState<Date>(getCurrentDate());

  const handleSetMockDate = () => {
    setMockDate(date);
    alert(`Simulirani datum je postavljen na: ${formatDate(date)}`);
  };

  const handleResetDate = () => {
    resetMockDate();
    setDate(new Date());
    alert("Mock datum resetiran - koristi se stvarni sistemski datum");
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setDate(new Date(e.target.value));
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 max-w-md shadow-lg">
      <h2 className="text-lg font-bold mb-4">🛠️ Test alat - Mock datum</h2>
      
      <div className="mb-4">
        <span className="block text-sm font-medium mb-1">Trenutni datum u aplikaciji:</span>
        <div className="text-xl font-bold">{formatDate(getCurrentDate())}</div>
      </div>
      
      <div className="space-y-4">
        <div>
          <span className="block text-sm font-medium mb-1">Odaberi simulirani datum:</span>
          <input 
            type="date" 
            value={formatInputDate(date)} 
            onChange={handleDateChange}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleSetMockDate} 
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Postavi mock datum
          </button>
          <button 
            onClick={handleResetDate} 
            className="flex-1 bg-gray-200 px-4 py-2 rounded"
          >
            Resetiraj
          </button>
        </div>
        
        <div className="text-sm text-gray-500 mt-4">
          <p>Napomena: Ovaj alat omogućuje testiranje funkcionalnosti vezanih za datum (npr. kraj godine)</p>
          <p className="mt-1 font-bold">Samo za razvojno okruženje!</p>
        </div>
      </div>
    </div>
  );
};

export default DateMockTool;