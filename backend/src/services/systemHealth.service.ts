// services/systemHealth.service.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import prisma from '../utils/prisma.js';
import { parseDate } from '../utils/dateUtils.js';
import { getCurrentDate } from '../utils/dateUtils.js';

/**
 * Tipovi za statuse zdravlja sustava
 */
export type SystemHealthStatus = 'Healthy' | 'Warning' | 'Critical';

/**
 * Informacije o stanju sustava
 */
export interface SystemHealthInfo {
  status: SystemHealthStatus;
  dbConnection: boolean;
  diskSpace: {
    available: number;
    total: number;
    percentUsed: number;
  };
  memory: {
    available: number;
    total: number;
    percentUsed: number;
  };
  uptime: number; // vrijeme rada servera u sekundama
  lastCheck: Date;
}

/**
 * Informacije o sigurnosnoj kopiji
 */
export interface BackupInfo {
  lastBackup: Date | null;
  backupSize: number | null;
  backupLocation: string | null;
  status: 'Success' | 'Failed' | 'Never' | 'Unknown';
}

const DISK_WARNING_THRESHOLD = 80; // postotak iskorištenosti diska kada počinje upozorenje
const DISK_CRITICAL_THRESHOLD = 90; // postotak iskorištenosti diska kada postaje kritično
const MEMORY_WARNING_THRESHOLD = 80; // postotak iskorištenosti memorije kada počinje upozorenje
const MEMORY_CRITICAL_THRESHOLD = 90; // postotak iskorištenosti memorije kada postaje kritično

/**
 * Servis za provjeru i praćenje zdravlja sustava
 */
const systemHealthService = {
  /**
   * Provjera zdravlja sustava
   */
  async checkSystemHealth(): Promise<SystemHealthInfo> {
    const lastCheck = getCurrentDate();
    let dbConnection = true;
    let diskSpace = { available: 0, total: 0, percentUsed: 0 };
    let memory = { available: 0, total: 0, percentUsed: 0 };
    
    try {
      // 1. Provjera veze s bazom podataka
      await prisma.$queryRaw`SELECT 1`;
      
      // 2. Provjera dostupnog prostora na disku (za direktorij aplikacije)
      const appDir = process.cwd();
      try {
        const stats = fs.statfsSync(appDir);
        const total = stats.blocks * stats.bsize;
        const available = stats.bavail * stats.bsize;
        const used = total - available;
        const percentUsed = Math.round((used / total) * 100);
        
        diskSpace = { 
          total: total, 
          available: available, 
          percentUsed: percentUsed 
        };
      } catch (diskError) {
        console.error('Greška prilikom provjere prostora na disku:', diskError);
        // Ne prekidamo izvršavanje, nastavljamo s drugim provjerama
      }
      
      // 3. Provjera memorije sustava
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const percentUsed = Math.round((usedMem / totalMem) * 100);
      
      memory = {
        total: totalMem,
        available: freeMem,
        percentUsed: percentUsed
      };
      
      // 4. Uptime servera
      const uptime = process.uptime(); // u sekundama
      
      // Određivanje ukupnog statusa zdravlja
      let status: SystemHealthStatus = 'Healthy';
      
      if (diskSpace.percentUsed >= DISK_WARNING_THRESHOLD || memory.percentUsed >= MEMORY_WARNING_THRESHOLD) {
        status = 'Warning';
      }
      
      if (!dbConnection || diskSpace.percentUsed >= DISK_CRITICAL_THRESHOLD || memory.percentUsed >= MEMORY_CRITICAL_THRESHOLD) {
        status = 'Critical';
      }
      
      return {
        status,
        dbConnection,
        diskSpace,
        memory,
        uptime,
        lastCheck
      };
    } catch (error) {
      console.error('Greška prilikom provjere zdravlja sustava:', error);
      dbConnection = false;
      
      return {
        status: 'Critical',
        dbConnection,
        diskSpace,
        memory,
        uptime: process.uptime(),
        lastCheck
      };
    }
  },
  
  /**
   * Dohvaća informacije o zadnjoj sigurnosnoj kopiji
   * Napomena: Ovo je simulacija prave implementacije koja bi provjeravala stvarne sigurnosne kopije
   */
  async getBackupInfo(): Promise<BackupInfo> {
    try {
      // Provjeri je li postavljen put za sigurnosne kopije u konfiguraciji
      const backupConfigPath = path.join(process.cwd(), 'config', 'backup-config.json');
      
      // Ako konfiguracijska datoteka postoji, učitaj je
      if (fs.existsSync(backupConfigPath)) {
        try {
          const configData = fs.readFileSync(backupConfigPath, 'utf8');
          const config = JSON.parse(configData);
          
          if (config.lastBackup && config.backupLocation) {
            return {
              lastBackup: parseDate(config.lastBackup),
              backupSize: config.backupSize || null,
              backupLocation: config.backupLocation,
              status: config.status || 'Success'
            };
          }
        } catch (configError) {
          console.error('Greška pri čitanju konfiguracije sigurnosne kopije:', configError);
        }
      }
      
      // Provjeri logove sigurnosnih kopija (simulacija)
      // U stvarnoj implementaciji, ovdje biste provjerili stvarne logove sigurnosnih kopija
      
      // Ako ne možemo pronaći podatke o sigurnosnoj kopiji, vraćamo zadani odgovor
      return {
        lastBackup: null,
        backupSize: null,
        backupLocation: null,
        status: 'Never' // nikada nije napravljena sigurnosna kopija
      };
    } catch (error) {
      console.error('Greška prilikom dohvaćanja informacija o sigurnosnoj kopiji:', error);
      return {
        lastBackup: null,
        backupSize: null,
        backupLocation: null,
        status: 'Unknown'
      };
    }
  },
  
  /**
   * Formatira informacije o zdravlju sustava za prikaz na dashboardu
   */
  formatHealthStatus(health: SystemHealthInfo): string {
    return health.status;
  },
  
  /**
   * Formatira informacije o zadnjoj sigurnosnoj kopiji za prikaz na dashboardu
   */
  formatBackupInfo(backup: BackupInfo): string {
    if (backup.lastBackup) {
      // Formatiraj datum u čitljivi oblik
      const date = backup.lastBackup;
      const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      return formattedDate;
    }
    
    if (backup.status === 'Never') {
      return 'Nikad';
    }
    
    return 'Nepoznato';
  }
};

export default systemHealthService;
