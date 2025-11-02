import { useState, useEffect } from 'react';
import { getUsedSkills, ApiUsedSkill } from '../utils/api/apiSkills';

/**
 * Hook za dohvaćanje korištenih vještina
 */
export const useUsedSkills = () => {
  const [skills, setSkills] = useState<ApiUsedSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedSkills = await getUsedSkills();
        setSkills(fetchedSkills);
      } catch (err) {
        setError('Greška prilikom učitavanja vještina');
        console.error('Failed to fetch used skills:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchSkills();
  }, []);

  return { skills, loading, error };
};
