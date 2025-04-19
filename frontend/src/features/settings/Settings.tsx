import React, { useState, useEffect } from "react";
import { SystemSettings } from "@shared/settings.types";
import { Alert, AlertDescription } from "@components/ui/alert";
import { useToast } from "@components/ui/use-toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/config";
import { AdminPermissionsManager } from '../../../components/AdminPermissionsManager';
import { Member } from '@shared/member';
import { useAuth } from "../../context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import CardNumberManagement from './CardNumberManagement';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    id: "default",
    cardNumberLength: 5,
    renewalStartMonth: 11, // December by default
    renewalStartDay: 31,
    updatedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Member[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/settings`, {
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

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchAdmins = async () => {
      if (user?.role !== 'superuser') return;
      
      try {
        console.log('Fetching admins...');
        const response = await axios.get(`${API_BASE_URL}/members`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          params: {
            role: 'admin',
            status: 'registered'
          }
        });
        
        // Filtrirati samo korisnike koji imaju admin role
        const adminUsers = response.data.filter(
          (member: Member) => member.role === 'admin'
        );
        
        console.log('Filtered admin users:', adminUsers);
        setAdmins(adminUsers);
      } catch (error) {
        console.error('Failed to fetch admins:', error);
        toast({
          title: "Error",
          description: "Failed to fetch admin users",
          variant: "destructive"
        });
      }
    };

    fetchAdmins();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/settings`, settings, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        setSettings(response.data);
        
        // Postaviti poruku uspjeha koja će se prikazati u komponenti
        setSuccessMessage("Settings updated successfully! Card Number Length: " + 
                          response.data.cardNumberLength + 
                          " | Membership Renewal Date: " + 
                          (response.data.renewalStartMonth === 10 ? "November" : "December") + 
                          " " + response.data.renewalStartDay);
        
        // Također prikazati toast notifikaciju
        toast({
          title: "Settings Saved",
          description: "Your system settings have been updated successfully",
          variant: "default",
          duration: 5000, // Prikazati 5 sekundi
        });
        
        // Automatski sakriti poruku uspjeha nakon 8 sekundi
        setTimeout(() => {
          setSuccessMessage(null);
        }, 8000);
      }
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'An unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update settings: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);

    if (name === 'renewalStartDay' && (numValue < 1 || numValue > 31)) {
      setError('Renewal start day must be between 1 and 31');
      return;
    }

    setError(null);
    setSettings(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">System Settings</h1>
        <p className="opacity-90">Configure global system parameters</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-6">
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
            <p className="text-sm text-gray-500 mt-1">
              Define the length of membership card numbers.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Membership Renewal Cutoff Date
            </label>
            <div className="flex space-x-4">
              <select
                name="renewalStartMonth"
                value={settings.renewalStartMonth}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  renewalStartMonth: parseInt(e.target.value)
                }))}
                className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-1/2"
              >
                <option value={11}>December</option>
                <option value={10}>November</option>
              </select>
              <input
                type="number"
                name="renewalStartDay"
                min="1"
                max="31"
                value={settings.renewalStartDay}
                onChange={handleChange}
                className="shadow border rounded w-1/2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="mt-2 space-y-2">
              <p className="text-sm text-gray-500">
                Set the cutoff date for membership renewal processing.
              </p>
              <p className="text-sm text-blue-600">
                If payment is received after this date, the membership will start from January 1st of the next year.
              </p>
              <p className="text-sm text-blue-600">
                If payment is received before or on this date, the membership starts immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-black hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">Important Note</h2>
        <p className="text-sm text-yellow-700">
          Changes to these settings will affect how new membership payments are processed. 
          Existing membership periods will not be affected by these changes.
        </p>
      </div>

      {user?.role === 'superuser' && (
        <div className="mt-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
            <h2 className="text-xl font-bold">Admin Permissions</h2>
            <p className="opacity-90">Manage permissions for admin users</p>
          </div>
          
          <Select
            value={selectedAdminId}
            onValueChange={(value) => {
              console.log('Selected admin ID:', value); // Debug log
              setSelectedAdminId(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an admin to manage" />
            </SelectTrigger>
            <SelectContent>
              {admins.map(admin => (
                <SelectItem key={admin.member_id} value={admin.member_id.toString()}>
                  {admin.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAdminId && (
            <div className="mt-4">
              <AdminPermissionsManager 
                admin={admins.find(a => a.member_id === parseInt(selectedAdminId))!} 
              />
            </div>
          )}
        </div>
      )}

      {user?.role === 'superuser' && (
        <div className="mt-8">
          <CardNumberManagement />
        </div>
      )}
    </div>
  );
};

export default Settings;