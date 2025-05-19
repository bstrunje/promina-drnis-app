import React, { useState, useEffect } from "react";
import { SystemSettings } from "@shared/settings.types";
import { Alert, AlertDescription } from "@components/ui/alert";
import { useToast } from "@components/ui/use-toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/config";
import { getCurrentDate } from "../../utils/dateUtils";
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

// Mjeseci na hrvatskom ako zatrebaju u budućnosti
// const MONTHS = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'];

const Settings: React.FC = () => {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [settings, setSettings] = useState<SystemSettings>({
    id: "default",
    renewalStartMonth: 11, // December by default
    renewalStartDay: 31,
    updatedAt: getCurrentDate(),
  });
  // const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  // const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Member[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");

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
        const responseData = response.data as unknown[];
        const adminUsers = responseData
          .filter(
            (item): item is Member => 
              typeof item === 'object' && 
              item !== null && 
              'role' in item && 
              item.role === 'admin'
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

    void fetchAdmins();
  }, [user, toast]);

  // Submission handler - trenutno nekorišten jer se postavke ne ažuriraju
  // Ovo je zadržano kao referenca za buduću implementaciju
  /*
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      // Implementacija ažuriranja postavki
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : 'An unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update settings: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };
  */

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Admin Card & Permissions Management</h1>
        <p className="opacity-90">Manage membership card numbers and admin permissions</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Poruka o uspjehu trenutno nije potrebna jer nemamo aktivne akcije koje bi je koristile
      {successMessage && (
        <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      */}

      {user?.role === 'superuser' && (
        <div className="mt-8">
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

          {selectedAdminId && (() => {
            // Prvo pronađemo admina i onda provjerimo da li postoji
            const selectedAdmin = admins.find(a => a.member_id === parseInt(selectedAdminId));
            return selectedAdmin ? (
              <div className="mt-4">
                <AdminPermissionsManager 
                  admin={selectedAdmin} 
                />
              </div>
            ) : (
              <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-md">
                Admin nije pronađen. Možda je uklonjen iz sustava.
              </div>
            );
          })()
          }
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