import { useState, useEffect } from 'react';

import { getCardNumberLength } from '../utils/api/apiCards';


// error je sada tipa unknown radi sigurnosti
export function useCardNumberLength(): { length: number, isLoading: boolean, error: unknown } {
  const [length, setLength] = useState<number>(5); // Default
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // error je sada tipa unknown radi sigurnosti
  const [error, setError] = useState<unknown>(null);
 
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

    void fetchLength();
  }, []);

  return {  length,
    isLoading,
    error};
}
