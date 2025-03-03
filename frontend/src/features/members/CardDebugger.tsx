import React, { useEffect, useState } from "react";

export default function CardDebugger() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function testCardApi() {
      try {
        console.log("Direct fetch test starting...");
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/card-numbers/available`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log("API Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log("API Response data:", responseData);
        setData(responseData);
      } catch (err) {
        console.error("API test error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    
    testCardApi();
  }, []);
  
  return (
    <div style={{ margin: '20px', padding: '10px', border: '1px solid #ddd' }}>
      <h3>Card API Debug</h3>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data && (
        <>
          <p>Found {Array.isArray(data) ? data.length : 0} card numbers:</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
