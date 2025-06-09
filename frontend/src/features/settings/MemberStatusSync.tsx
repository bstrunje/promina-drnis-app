// frontend/src/features/settings/MemberStatusSync.tsx
import React, { useState } from 'react';
import { Alert, AlertDescription } from "@components/ui/alert";
import { Button } from "@components/ui/button";
import apiAdmin from '../../utils/api/apiAdmin';

/**
 * Komponenta za sinkronizaciju statusa članova
 * Omogućuje administratorima da pokrenu sinkronizaciju statusa članova na temelju postojanja broja iskaznice
 */
const MemberStatusSync: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    updatedCount?: number;
  }>({});

  /**
   * Pokreće sinkronizaciju statusa članova
   */
  const handleSyncMemberStatuses = async () => {
    setIsLoading(true);
    setResult({});

    try {
      const response = await apiAdmin.syncMemberStatuses();
      
      setResult({
        success: response.success,
        message: response.message,
        updatedCount: response.updatedCount
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Greška pri sinkronizaciji statusa članova'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Sinkronizacija statusa članova</h2>
      <p className="text-gray-600 mb-4">
        Ova funkcija će sinkronizirati statuse članova na temelju postojanja broja iskaznice.
        Svi članovi koji imaju broj iskaznice, a nemaju status "registered" ili nemaju označeno
        "registration_completed", bit će automatski ažurirani.
      </p>
      
      <div className="flex items-center gap-4">
        <Button 
          onClick={handleSyncMemberStatuses} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Sinkronizacija u tijeku...' : 'Pokreni sinkronizaciju'}
        </Button>
        
        {result.message && (
          <Alert variant={result.success ? "default" : "destructive"} className="flex-1">
            <AlertDescription>
              {result.message}
              {result.success && result.updatedCount !== undefined && (
                <span className="ml-2">
                  Ažurirano članova: <strong>{result.updatedCount}</strong>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default MemberStatusSync;
