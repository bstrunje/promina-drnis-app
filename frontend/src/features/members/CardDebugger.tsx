import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';

// Definiramo tip za podatke koji dolaze s API-ja
interface CardApiResponse {
  available: number[];
  total: number;
  inUse: number;
}

export default function CardDebugger(): JSX.Element {
  const [data, setData] = useState<CardApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(['members', 'common']);
  
  useEffect(() => {
    // Definiramo asinkronu funkciju za dohvaćanje podataka
    async function testCardApi(): Promise<void> {
      try {
        // Dohvaćamo token iz localStorage
        const token = localStorage.getItem('token');
        
        // Koristimo nullish coalescing operator umjesto logical OR
        const apiUrl = process.env.REACT_APP_API_URL ?? 'http://localhost:3000';
        
        const response = await fetch(`${apiUrl}/api/card-numbers/available`, {
          headers: {
            Authorization: `Bearer ${token ?? ''}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        // Dohvaćamo podatke i eksplicitno ih tipiziramo kao Record<string, unknown>
        const responseData = await response.json() as Record<string, unknown>;
        
        // Sigurno pristupamo svojstvima i validiramo ih
        let availableNumbers: number[] = [];
        if ('available' in responseData && Array.isArray(responseData.available)) {
          availableNumbers = responseData.available.filter(
            (item): item is number => typeof item === 'number'
          );
        }
        
        const total = 
          'total' in responseData && typeof responseData.total === 'number'
            ? responseData.total 
            : 0;
            
        const inUse = 
          'inUse' in responseData && typeof responseData.inUse === 'number'
            ? responseData.inUse
            : 0;
        
        // Kreiramo validiran objekt
        const validatedData: CardApiResponse = {
          available: availableNumbers,
          total,
          inUse
        };
        
        setData(validatedData);
      } catch (err) {
        console.error("API test error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    
    // Koristimo void operator za rješavanje no-floating-promises greške
    void testCardApi();
  }, []);
  
  // Sigurno pristupamo svojstvima data objekta
  const availableCount = data?.available.length ?? 0;
  
  return (
    <div style={{ margin: '20px', padding: '10px', border: '1px solid #ddd' }}>
      <h3>{t('members:cardDebugger.title')}</h3>
      {loading && <p>{t('common:loading')}</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data && (
        <>
          <p>Found {availableCount} card numbers:</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
