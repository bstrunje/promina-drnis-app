/**
 * Utility funkcije za refresh token mehanizam
 */

export const MAX_REFRESH_RETRIES = 3;
export const REFRESH_RETRY_DELAY = 1000;

/**
 * Pomoćna funkcija za odgodu (delay)
 */
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Pomoćna funkcija koja izvršava callback s retry mehanizmom
 */
export async function withRetry<T>(
  callback: (retryCount: number) => Promise<T | null>,
  maxRetries = MAX_REFRESH_RETRIES,
  delayMs = REFRESH_RETRY_DELAY
): Promise<T | null> {
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Pokušaj ${retryCount + 1}/${maxRetries + 1}...`);
      const result = await callback(retryCount);
      if (result !== null) {
        return result;
      }

      // Ako smo dobili null ali imamo još pokušaja
      if (retryCount < maxRetries) {
        console.log(`Pokušaj ${retryCount + 1} nije uspio, čekam prije ponovnog pokušaja...`);
        await delay(delayMs);
        retryCount++;
      } else {
        console.log(`Svi pokušaji iscrpljeni (${maxRetries + 1}/${maxRetries + 1})`);
        return null;
      }
    } catch (error) {
      console.error(`Greška u pokušaju ${retryCount + 1}/${maxRetries + 1}:`, error);
      
      // Ako imamo još pokušaja
      if (retryCount < maxRetries) {
        console.log(`Čekam prije ponovnog pokušaja nakon greške...`);
        await delay(delayMs);
        retryCount++;
      } else {
        console.log(`Svi pokušaji iscrpljeni nakon greške (${maxRetries + 1}/${maxRetries + 1})`);
        throw error;
      }
    }
  }

  return null;
}
