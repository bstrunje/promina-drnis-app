import { useState, useEffect } from 'react';
import api from '../utils/api/apiConfig';
import { getCardNumberLength } from '../utils/api/apiCards';
import { SystemSettings } from '@shared/settings';

export function useCardNumberLength(): { length: number, isLoading: boolean, error: any } {
  const [length, setLength] = useState<number>(5); // Default
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
 
  useEffect(() => {
    const fetchLength = async () => {
      try {
        const cardLength = await getCardNumberLength();
        setLength(cardLength);
      } catch (err) {
        setError(err);
        console.error('Error fetching card number length:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLength();
  }, []);

  return {  length,
    isLoading,
    error};
}
