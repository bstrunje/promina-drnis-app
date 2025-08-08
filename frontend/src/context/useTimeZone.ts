import { useContext } from 'react';
import { TimeZoneContext } from './timeZone-core';

// Hook za korištenje konteksta vremenske zone
// Odvojen u posebnu datoteku radi kompatibilnosti s Fast Refresh pravilima
export function useTimeZone() {
  return useContext(TimeZoneContext);
}
