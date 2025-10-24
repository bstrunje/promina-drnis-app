import React, { useState, useEffect, useCallback } from 'react';
import { useSystemManagerNavigation } from './hooks/useSystemManagerNavigation';
import { ArrowLeft } from 'lucide-react';
import { getDutySettings, updateDutySettings } from './utils/systemManagerApi';
import './DutyCalendarSettings.css';

interface DutySettingsState {
  dutyCalendarEnabled: boolean;
  dutyMaxParticipants: number;
  dutyAutoCreateEnabled: boolean;
}

const DutyCalendarSettings: React.FC = () => {
  const { navigateTo } = useSystemManagerNavigation();
  const [settings, setSettings] = useState<DutySettingsState>({
    dutyCalendarEnabled: false,
    dutyMaxParticipants: 2,
    dutyAutoCreateEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDutySettings();
      setSettings({
        dutyCalendarEnabled: data.dutyCalendarEnabled ?? false,
        dutyMaxParticipants: data.dutyMaxParticipants ?? 2,
        dutyAutoCreateEnabled: data.dutyAutoCreateEnabled ?? true
      });
    } catch (error) {
      console.error('Error fetching duty settings:', error);
      alert('Failed to load duty calendar settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDutySettings(settings);
      alert('Duty calendar settings updated successfully');
    } catch (error) {
      console.error('Error updating duty settings:', error);
      alert('Failed to update duty calendar settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCalendar = (enabled: boolean) => {
    setSettings({ ...settings, dutyCalendarEnabled: enabled });
  };

  const handleMaxParticipantsChange = (value: number) => {
    if (value >= 1 && value <= 10) {
      setSettings({ ...settings, dutyMaxParticipants: value });
    }
  };

  const handleToggleAutoCreate = (enabled: boolean) => {
    setSettings({ ...settings, dutyAutoCreateEnabled: enabled });
  };

  if (loading) {
    return (
      <div className="duty-settings-loading">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="duty-calendar-settings">
      <div className="settings-header">
        <button
          onClick={() => navigateTo('/system-manager/settings')}
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
        <h2>Duty Calendar Configuration</h2>
        <p>Manage duty calendar availability and settings for members</p>
      </div>

      <div className="settings-panel">
        {/* Enable/Disable Calendar */}
        <div className="setting-item">
          <div className="setting-info">
            <h3>
              <span className={settings.dutyCalendarEnabled ? 'status-enabled' : 'status-disabled'}>
                {settings.dutyCalendarEnabled ? '✅' : '❌'}
              </span>
              Enable Duty Calendar
            </h3>
            <p>
              When enabled, members can view and join duty shifts through the duty calendar. 
              When disabled, the calendar is hidden from all members.
            </p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.dutyCalendarEnabled}
                onChange={(e) => handleToggleCalendar(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {settings.dutyCalendarEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Max Participants */}
        <div className="setting-item">
          <div className="setting-info">
            <h3>Max Participants per Duty</h3>
            <p>
              Maximum number of members that can join a single duty shift. 
              Valid range: 1-10 members.
            </p>
          </div>
          <div className="setting-control">
            <div className="number-input-group">
              <button
                className="btn-decrement"
                onClick={() => handleMaxParticipantsChange(settings.dutyMaxParticipants - 1)}
                disabled={settings.dutyMaxParticipants <= 1}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.dutyMaxParticipants}
                onChange={(e) => handleMaxParticipantsChange(Number(e.target.value))}
                className="number-input"
              />
              <button
                className="btn-increment"
                onClick={() => handleMaxParticipantsChange(settings.dutyMaxParticipants + 1)}
                disabled={settings.dutyMaxParticipants >= 10}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Auto-Create on Click */}
        <div className="setting-item">
          <div className="setting-info">
            <h3>Auto-Create Duties</h3>
            <p>
              When enabled, clicking on an available date will automatically create a new duty 
              and add the member to it. When disabled, duties must be manually created by admins.
            </p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.dutyAutoCreateEnabled}
                onChange={(e) => handleToggleAutoCreate(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {settings.dutyAutoCreateEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button
          className="btn-save-settings"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>ℹ️ Important Notes:</h4>
        <ul>
          <li>Duty calendar follows seasonal schedules (Winter, Summer, Summer Peak)</li>
          <li>Only weekends and holidays are available for duty assignments</li>
          <li>July-August: Only Sundays are available (Summer Peak season)</li>
          <li>Members can only join duties on enabled dates</li>
          <li>Admins can always edit duties through the Activities management page</li>
        </ul>
      </div>
    </div>
  );
};

export default DutyCalendarSettings;
