import React, { useState } from "react";

import { SystemSettings } from "@shared/settings";
import { Alert, AlertDescription } from "@components/ui/alert";
 
import { getCurrentDate } from "../../utils/dateUtils";

import { useAuth } from "../../context/useAuth";

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
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
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



      {user?.role === 'member_superuser' && (
        <div className="mt-8">
          <CardNumberManagement />
        </div>
      )}
    </div>
  );
};

export default Settings;