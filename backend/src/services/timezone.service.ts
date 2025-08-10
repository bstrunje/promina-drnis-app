/**
 * Servis za upravljanje vremenskom zonom sustava
 * Koristi se za sinkronizaciju vremenske zone između postavki sustava i modula za datume
 */

import prisma from '../utils/prisma.js';
import { setSystemTimeZone, getSystemTimeZone } from '../utils/dateUtils.js';

const isDev = process.env.NODE_ENV === 'development';

class TimezoneService {
  private initialized = false;
  private static instance: TimezoneService;

  private constructor() {}

  /**
   * Vraća singleton instancu servisa
   */
  public static getInstance(): TimezoneService {
    if (!TimezoneService.instance) {
      TimezoneService.instance = new TimezoneService();
    }
    return TimezoneService.instance;
  }

  /**
   * Inicijalizira vremensku zonu iz baze podataka
   * Ovu metodu trebalo bi pozvati pri pokretanju aplikacije i nakon svake promjene postavki
   */
  public async initializeTimezone(): Promise<void> {
    try {
      const settings = await prisma.systemSettings.findFirst({
        where: { id: 'default' }
      });

      if (settings?.timeZone) {
        setSystemTimeZone(settings.timeZone);
        if (isDev) console.log(`🌐 Vremenska zona inicijalizirana iz baze: ${settings.timeZone}`);
      } else {
        // Koristi zadanu zonu 'Europe/Zagreb' ako nije definirana u postavkama
        setSystemTimeZone('Europe/Zagreb');
        if (isDev) console.log('🌐 Vremenska zona postavljena na zadanu: Europe/Zagreb');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Greška pri inicijalizaciji vremenske zone:', error);
      // Koristi zadanu zonu kao fallback
      setSystemTimeZone('Europe/Zagreb');
    }
  }

  /**
   * Ažurira vremensku zonu u postavkama sustava
   * @param timeZone Nova vremenska zona (npr. 'Europe/Zagreb')
   */
  public async updateTimezone(timeZone: string): Promise<void> {
    try {
      await prisma.systemSettings.update({
        where: { id: 'default' },
        data: { timeZone }
      });

      setSystemTimeZone(timeZone);
      if (isDev) console.log(`🌐 Vremenska zona ažurirana na: ${timeZone}`);
    } catch (error) {
      console.error('Greška pri ažuriranju vremenske zone:', error);
      throw error;
    }
  }

  /**
   * Vraća trenutno postavljenu vremensku zonu
   */
  public getTimezone(): string {
    return getSystemTimeZone();
  }

  /**
   * Provjerava je li servis inicijaliziran
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Exportamo singleton instancu
const timezoneService = TimezoneService.getInstance();
export default timezoneService;
