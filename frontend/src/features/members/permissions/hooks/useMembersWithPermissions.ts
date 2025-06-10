// features/members/permisssions/hooks/useMembersWithPermissions.ts
import { useState, useEffect, useCallback } from 'react';
import { getMembersWithPermissions } from '../api/memberPermissionsApi';
import { MemberWithPermissions } from '@shared/systemManager';

/**
 * Hook za dohvat i upravljanje članovima s administratorskim ovlastima
 * Enkapsulira logiku učitavanja i praćenja grešaka
 */
const useMembersWithPermissions = (activeTab: string) => {
  // Stanje za članove s ovlastima
  const [membersWithPermissions, setMembersWithPermissions] = useState<MemberWithPermissions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Funkcija za dohvat članova s ovlastima
  const fetchMembersWithPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMembersWithPermissions();
      setMembersWithPermissions(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Došlo je do greške prilikom dohvata članova s ovlastima.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Dohvat članova kad je aktivan članski tab
  useEffect(() => {
    if (activeTab === 'members') {
      void fetchMembersWithPermissions();
    }
  }, [activeTab, fetchMembersWithPermissions]);

  return {
    membersWithPermissions,
    loading,
    error,
    refreshMembersWithPermissions: fetchMembersWithPermissions
  };
};

export default useMembersWithPermissions;
