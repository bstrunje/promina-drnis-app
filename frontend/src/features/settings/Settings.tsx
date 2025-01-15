import React, { useState, useEffect } from "react";
import { SystemSettings } from '@shared/settings.types';
import axios from "axios";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    id: 'default',
    cardNumberLength: 5,
    renewalStartDay: 1,    // Default: November 1st
    updatedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const loadSettings = async () => {
  try {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    setSettings(response.data);
  } catch (err) {
    const errorMessage = axios.isAxiosError(err)
      ? err.response?.data?.message || err.message
      : 'An unknown error occurred';
    setError(`Failed to load settings: ${errorMessage}`);
  } finally {
    setIsLoading(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) throw new Error('Failed to update settings');
      
      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      alert('Settings updated successfully');
    } catch (err) {
      setError("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Card Number Length
          </label>
          <input
            type="number"
            name="cardNumberLength"
            min="1"
            max="10"
            value={settings.cardNumberLength}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Membership Renewal Start Date (November)
          </label>
          <input
            type="number"
            name="renewalStartDay"
            min="1"
            max="30"
            value={settings.renewalStartDay}
            onChange={handleChange}
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-sm text-gray-500 mt-1">
            Day in November when membership renewal period starts. Period always ends December 31st.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
};

export default Settings;