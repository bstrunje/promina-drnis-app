import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { 
  getHolidaysForYear, 
  createHoliday, 
  updateHoliday, 
  deleteHoliday, 
  seedDefaultHolidays, 
  deleteHolidaysForYear,
  type Holiday 
} from './utils/systemManagerApi';
import './HolidaysManager.css';

const HolidaysManager: React.FC = () => {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    is_recurring: false
  });

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolidaysForYear(selectedYear);
      setHolidays(data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      alert('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Dohvat praznika
  useEffect(() => {
    void fetchHolidays();
  }, [fetchHolidays]);

  // Handlers
  const handleAdd = () => {
    setFormData({ date: '', name: '', is_recurring: false });
    setEditingHoliday(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setFormData({
      date: holiday.date.split('T')[0], // Extract YYYY-MM-DD
      name: holiday.name,
      is_recurring: holiday.is_recurring
    });
    setEditingHoliday(holiday);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete this holiday for ${selectedYear}?`)) return;
    
    try {
      await deleteHoliday(id);
      await fetchHolidays();
      alert(`Holiday deleted successfully for ${selectedYear}`);
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert(`Failed to delete holiday for ${selectedYear}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, formData);
        alert(`Holiday updated successfully for ${selectedYear}`);
      } else {
        await createHoliday(formData);
        alert(`Holiday created successfully for ${selectedYear}`);
      }
      
      setIsAddModalOpen(false);
      await fetchHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save holiday';
      alert(errorMsg);
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm(`Seed default Croatian holidays for ${selectedYear}?`)) return;
    
    try {
      const result = await seedDefaultHolidays(selectedYear);
      alert(`Seeded ${result.created} holidays, skipped ${result.skipped} (already exist) for ${selectedYear}`);
      await fetchHolidays();
    } catch (error) {
      console.error('Error seeding holidays:', error);
      alert(`Failed to seed holidays for ${selectedYear}`);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete ALL holidays for ${selectedYear}? This cannot be undone!`)) return;
    
    try {
      const result = await deleteHolidaysForYear(selectedYear);
      alert(`Deleted ${result.count} holidays for ${selectedYear}`);
      await fetchHolidays();
    } catch (error) {
      console.error('Error deleting holidays:', error);
      alert(`Failed to delete holidays for ${selectedYear}`);
    }
  };

  return (
    <div className="holidays-manager">
      <div className="holidays-header">
        <button
          onClick={() => navigate('/system-manager/settings')}
          className="back-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            marginBottom: '1rem',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: '#374151',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          <ArrowLeft size={16} />
          Back to Settings
        </button>
        <h2>Manage Holidays / Non-Working Days</h2>
        <p>Configure holidays and non-working days for the duty calendar</p>
      </div>

      {/* Toolbar */}
      <div className="holidays-toolbar">
        <div className="year-selector">
          <label>Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-actions">
          <button className="btn-seed" onClick={() => void handleSeedDefaults()}>
            🌱 Seed Default Holidays
          </button>
          <button className="btn-add" onClick={handleAdd}>
            ➕ Add Holiday
          </button>
          <button className="btn-delete-all" onClick={() => void handleDeleteAll()}>
            🗑️ Delete All ({selectedYear})
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="holidays-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Recurring</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>
                  No holidays found for {selectedYear}
                </td>
              </tr>
            ) : (
              holidays.map(holiday => (
                <tr key={holiday.id}>
                  <td>{new Date(holiday.date).toLocaleDateString()}</td>
                  <td>{holiday.name}</td>
                  <td>{holiday.is_recurring ? '✅ Yes' : '❌ No'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(holiday)}>
                      ✏️ Edit
                    </button>
                    <button className="btn-delete" onClick={() => void handleDelete(holiday.id)}>
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>
            
            <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }}>
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Christmas, New Year"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  />
                  Recurring (repeats every year)
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingHoliday ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaysManager;
