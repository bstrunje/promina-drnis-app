import db from "../utils/db.js";
import stampRepository from "../repositories/stamp.repository.js";
import { getCurrentDate } from "../utils/dateUtils.js";
import prisma from "../utils/prisma.js";

/**
 * Servis za zakazane zadatke koji se izvršavaju automatski
 */
const scheduledService = {
  /**
   * Provjera je li danas zadnji dan u godini
   * @returns boolean
   */
  isLastDayOfYear(): boolean {
    const today = getCurrentDate();
    const day = today.getDate();
    const month = today.getMonth(); // 0-11: 0=Jan, 11=Dec
    
    // Provjeri je li 31. prosinca (dan=31, mjesec=11)
    return day === 31 && month === 11;
  },
  
  /**
   * Provjera je li danas prvi dan u godini
   * @returns boolean
   */
  isFirstDayOfYear(): boolean {
    const today = getCurrentDate();
    const day = today.getDate();
    const month = today.getMonth(); // 0-11: 0=Jan, 11=Dec
    
    // Provjeri je li 1. siječnja (dan=1, mjesec=0)
    return day === 1 && month === 0;
  },
  
  /**
   * Provjerava je li već izvršeno arhiviranje za određenu godinu
   * @param year Godina za koju provjeravamo arhiviranje
   * @returns Promise<boolean>
   */
  async isArchivingDoneForYear(year: number): Promise<boolean> {
    try {
      console.log(`[SCHEDULED] Provjeravam je li arhiviranje već izvršeno za godinu ${year}`);
      
      // OPTIMIZACIJA: Zamjena legacy db.query s Prisma count upitom
      const count = await prisma.stamp_history.count({
        where: {
          year: year
        }
      });
      
      const isDone = count > 0;
      console.log(`[SCHEDULED] Arhiviranje za godinu ${year}: ${isDone ? 'već izvršeno' : 'nije izvršeno'} (${count} zapisa)`);
      
      return isDone;
    } catch (error) {
      console.error(`[SCHEDULED] Greška prilikom provjere arhiviranja za godinu ${year}:`, error);
      throw error;
    }
  },
  
  /**
   * Automatsko arhiviranje stanja markica na kraju godine
   * Poziva se prilikom svake provjere, ali izvršava se samo na zadnji dan u godini
   * @returns Promise<void>
   */
  async checkAndArchiveStamps(): Promise<void> {
    try {
      // Ako nije zadnji dan u godini, ne radimo ništa
      if (!this.isLastDayOfYear()) {
        return;
      }
      
      const currentYear = getCurrentDate().getFullYear();
      
      // Provjeri je li arhiviranje već izvršeno za ovu godinu
      const isDone = await this.isArchivingDoneForYear(currentYear);
      if (isDone) {
        console.log(`Arhiviranje za godinu ${currentYear} je već izvršeno.`);
        return;
      }
      
      console.log(`🔄 Izvršavam automatsko arhiviranje stanja markica za godinu ${currentYear}...`);
      
      // Koristi system manager ID 1 za automatsko arhiviranje
      const systemManagerId = 1; 
      const notes = `Automatsko arhiviranje na kraju godine ${currentYear}`;
      
      await stampRepository.archiveStampInventory(currentYear, systemManagerId, notes);
      
      console.log(`✅ Uspješno arhivirano stanje markica za godinu ${currentYear}`);
    } catch (error) {
      console.error('❌ Greška prilikom automatskog arhiviranja markica:', error);
    }
  }
};

export default scheduledService;
