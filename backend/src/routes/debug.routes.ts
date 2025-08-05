import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import util from 'util';
import { exec } from 'child_process';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

// Import db
import prisma from '../utils/prisma.js';

// Import member service

// Import membership service

import { getCurrentDate } from '../utils/dateUtils.js';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Debug endpoint to check if file exists
router.get('/file-exists/:subdirectory/:filename', async (req, res) => {
  try {
    const { subdirectory, filename } = req.params;
    const filePath = path.join(__dirname, '..', '..', 'uploads', subdirectory, filename);
    
    console.log('Checking if file exists:', filePath);
    
    try {
      const stats = await fsPromises.stat(filePath);
      res.json({
        exists: true,
        size: stats.size,
        isFile: stats.isFile(),
        lastModified: stats.mtime
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.status(404).json({
        exists: false,
        error: errorMessage,
        checkedPath: filePath
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// Define file info type
interface FileInfo {
  path: string;
  size: number;
  modified: Date;
}

// Define path info types
interface PathInfoBase {
  name: string;
  path: string;
  exists: boolean;
  canWrite: boolean;
}

interface PathInfoSuccess extends PathInfoBase {
  exists: true;
  isDirectory: boolean;
  permissions: string;
  writeTest?: string;
}

interface PathInfoError extends PathInfoBase {
  exists: false;
  error: string;
}

type PathInfo = PathInfoSuccess | PathInfoError;

// List all files in uploads directory and subdirectories
router.get('/fs/list-files', async (req, res) => {
  try {
    const basePath = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : path.join(__dirname, '..', '..', 'uploads');
    
    // Function to recursively list files with their sizes
    async function listFilesRecursive(dir: string, baseDir = ''): Promise<FileInfo[]> {
      const files = await fsPromises.readdir(dir, { withFileTypes: true });
      let results: FileInfo[] = [];
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.join(baseDir, file.name);
        
        if (file.isDirectory()) {
          const subResults = await listFilesRecursive(fullPath, relativePath);
          results = [...results, ...subResults];
        } else {
          const stats = await fsPromises.stat(fullPath);
          results.push({
            path: relativePath,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      return results;
    }
    
    // Create base directory if it doesn't exist
    await fsPromises.mkdir(basePath, { recursive: true });
    
    // List all files recursively
    const fileList = await listFilesRecursive(basePath);
    
    // Get disk usage information
    const { stdout: diskUsage } = await execPromise('df -h');
    
    // Check directory permissions
    const { stdout: permissions } = await execPromise(`ls -la ${basePath}`);
    
    res.json({
      basePath,
      files: fileList,
      diskUsage: diskUsage.trim().split('\n'),
      permissions: permissions.trim().split('\n'),
      fileCount: fileList.length,
      totalSize: fileList.reduce((sum: number, file: FileInfo) => sum + file.size, 0)
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Test writing a file and reading it back
router.post('/fs/test-write', async (req, res) => {
  try {
    const basePath = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : path.join(__dirname, '..', '..', 'uploads');
    
    const testFileName = `test-file-${Date.now()}.txt`;
    const testFilePath = path.join(basePath, testFileName);
    const content = `Test file created at ${getCurrentDate().toISOString()}`;
    
    // Ensure directory exists
    await fsPromises.mkdir(basePath, { recursive: true });
    
    // Write test file
    await fsPromises.writeFile(testFilePath, content, 'utf8');
    console.log(`Test file written to ${testFilePath}`);
    
    // Read it back
    const readContent = await fsPromises.readFile(testFilePath, 'utf8');
    
    // Get file stats
    const stats = await fsPromises.stat(testFilePath);
    
    res.json({
      success: true,
      file: {
        name: testFileName,
        path: testFilePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        contentMatches: readContent === content,
        content: readContent
      }
    });
  } catch (error) {
    console.error('Error in file write test:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Test all paths involved in image uploads
router.get('/fs/image-paths', async (req, res) => {
  try {
    const basePath = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : path.join(__dirname, '..', '..', 'uploads');
    
    const profileImagesDir = path.join(basePath, 'profile_images');
    
    // Information about all relevant directories
    const pathInfo = [
      { name: 'Base uploads', path: basePath },
      { name: 'Profile images', path: profileImagesDir },
    ];
    
    // Check all paths
    const results: PathInfo[] = [];
    for (const info of pathInfo) {
      try {
        await fsPromises.mkdir(info.path, { recursive: true });
        const stats = await fsPromises.stat(info.path);
        const { stdout } = await execPromise(`ls -la "${info.path}"`);
        
        results.push({
          ...info,
          exists: true,
          isDirectory: stats.isDirectory(),
          permissions: stdout.trim().split('\n')[0],
          canWrite: true
        });
      } catch (error) {
        results.push({
          ...info,
          exists: false,
          error: error instanceof Error ? error.message : String(error),
          canWrite: false
        });
      }
    }
    
    // Test writing to each directory
    for (const result of results) {
      if (result.exists && 'isDirectory' in result && result.isDirectory) {
        try {
          const testFile = path.join(result.path, `test-${Date.now()}.txt`);
          await fsPromises.writeFile(testFile, 'test', 'utf8');
          await fsPromises.unlink(testFile);
          (result as PathInfoSuccess).writeTest = 'success';
        } catch (error) {
          (result as PathInfoSuccess).writeTest = `failed: ${error instanceof Error ? error.message : String(error)}`;
          result.canWrite = false;
        }
      }
    }
    
    res.json({
      paths: results,
      summary: {
        allPathsExist: results.every(r => r.exists),
        allPathsWritable: results.every(r => r.canWrite),
      }
    });
  } catch (error) {
    console.error('Error checking image paths:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint za resetiranje testne baze podataka u razvojnom okruženju
router.post('/reset-test-database', async (req, res) => {
  // Dozvoljavamo resetiranje baze samo u development okruženju
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'Resetiranje baze podataka je dopušteno samo u razvojnom okruženju' 
    });
  }
  
  try {
    console.log('🔄 Resetiranje testne baze podataka...');
    
    // Spremamo podatke prije resetiranja
    let backupData: { 
      timestamp?: string; 
      filename?: string;
      members?: any[];
      membership_details?: any[];
      membership_periods?: any[];
      stamp_inventory?: any[];
      activities?: any[];
      activity_participants?: any[];
    } = {};
    
    try {
      // Dohvaćamo stanje ključnih tablica prije resetiranja
      const membersResult = await prisma.member.findMany();
      const membershipDetailsResult = await prisma.membershipDetails.findMany();
      const membershipPeriodsResult = await prisma.membershipPeriod.findMany();
      const stampInventoryResult = await prisma.stampInventory.findMany();
      const activitiesResult = await prisma.activity.findMany();
      const activityParticipantsResult = await prisma.activityParticipation.findMany();
      
      // Spremamo u backup objekt
      backupData = {
        timestamp: getCurrentDate().toISOString(),
        members: membersResult,
        membership_details: membershipDetailsResult,
        membership_periods: membershipPeriodsResult,
        stamp_inventory: stampInventoryResult,
        activities: activitiesResult,
        activity_participants: activityParticipantsResult
      };
      
      // Spašavamo backup u datoteku
      const backupDir = path.join(__dirname, '..', '..', 'backups');
      await fsPromises.mkdir(backupDir, { recursive: true });
      
      const backupFileName = `backup_${getCurrentDate().toISOString().replace(/[:.]/g, '-')}.json`;
      const backupPath = path.join(backupDir, backupFileName);
      
      await fsPromises.writeFile(
        backupPath, 
        JSON.stringify(backupData, null, 2), 
        'utf8'
      );
      
      console.log(`✅ Backup podataka spremljen u: ${backupPath}`);
    } catch (backupError) {
      console.error('⚠️ Greška prilikom stvaranja backupa:', backupError);
      // Nastavljamo s resetiranjem čak i ako backup nije uspio
    }
    
    // Koristimo Prisma transakciju za sigurno izvođenje svih izmjena
    await prisma.$transaction(async (tx) => {
      // 1. RESETIRANJE KORISNIKA I ČLANSTVA
      
      // Vraćanje statusa svih članova na "registered" (početni status)
      await tx.member.updateMany({
        data: {
          status: 'registered'
        }
      });
      
      // 2. RESETIRANJE ČLANARINA I PERIODA
      
      // Vraćanje članarina na trenutnu godinu i poništavanje datuma plaćanja
      const currentYear = getCurrentDate().getFullYear();
      await tx.membershipDetails.updateMany({
        data: {
          fee_payment_year: currentYear,
          fee_payment_date: null,
          card_stamp_issued: false,
          next_year_stamp_issued: false
        }
      });
      
      // 3. RESETIRANJE INVENTARA I MARKICA
      
      // Vraćanje inventara markica na početno stanje
      await tx.stampInventory.updateMany({
        data: {
          issued_count: 0
        }
      });
      
      // 6. RESETIRANJE PORUKA
      
      // Brisanje testnih poruka (zadnji dan)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      await tx.memberMessage.deleteMany({
        where: {
          created_at: {
            gt: oneDayAgo
          }
        }
      });
      
      // 8. RESETIRANJE UPDATE QUEUE-a
      
      // Brisanje svih stavki iz reda čekanja za ažuriranje lozinki
      await tx.password_update_queue.deleteMany({});
      
      console.log('✅ Baza podataka uspješno resetirana na početno stanje');
    }, {
      timeout: 12000 // 12 sekundi - ispod Prisma Accelerate limita
    });
    
    // Vraćamo uspješan odgovor s informacijom o backup-u
    res.json({ 
      success: true, 
      message: 'Testna baza podataka uspješno resetirana',
      backupCreated: backupData.timestamp ? true : false,
      backupTimestamp: backupData.timestamp || null,
      timestamp: getCurrentDate()
    });
  } catch (error) {
    console.error('❌ Greška prilikom resetiranja baze:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Nepoznata greška',
      timestamp: getCurrentDate()
    });
  }
});

// Endpoint za vraćanje podataka iz backup-a
router.post('/restore-from-backup/:filename', async (req, res) => {
  // Dozvoljavamo vraćanje backupa samo u development okruženju
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'Vraćanje backupa je dopušteno samo u razvojnom okruženju' 
    });
  }
  
  try {
    const { filename } = req.params;
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    const backupPath = path.join(backupDir, filename);
    
    console.log(`🔄 Pokušaj vraćanja podataka iz backupa: ${backupPath}`);
    
    // Provjera postojanja datoteke
    try {
      await fsPromises.access(backupPath, fs.constants.F_OK);
    } catch (err) {
      return res.status(404).json({ 
        error: `Backup datoteka nije pronađena: ${filename}` 
      });
    }
    
    // Učitavanje backup podataka
    const backupData = JSON.parse(
      await fsPromises.readFile(backupPath, 'utf8')
    );
    
    // Provjera strukture
    if (!backupData.members || !backupData.membership_details) {
      return res.status(400).json({ 
        error: 'Nevažeća struktura backup datoteke' 
      });
    }
    
    // Vraćanje podataka u transakciji
    await prisma.$transaction(async (tx) => {
      // Primjer vraćanja podataka za members tablicu
      // Ovo je kompleksno jer treba pažljivo obraditi svaki redak i polje
      // Ovdje je pojednostavljeni pristup za members tablicu
      
      console.log('🔄 Vraćanje podataka za članove...');
      
      // Prvo brisanje podataka iz tablica koje imaju strane ključeve
      await tx.password_update_queue.deleteMany({});
      await tx.activityParticipation.deleteMany({});
      await tx.annualStatistics.deleteMany({});
      await tx.auditLog.deleteMany({});
      await tx.memberMessage.deleteMany({});
      await tx.memberPermissions.deleteMany({});
      
      // Brisanje postojećih podataka iz membership_details (foreign key constraint)
      await tx.membershipDetails.deleteMany({});

      // Brisanje postojećih podataka iz members
      await tx.member.deleteMany({});
      
      // Inserti za members tablicu
      for (const member of backupData.members) {
        const { member_id, ...memberData } = member;
        
        await tx.member.create({
          data: {
            ...memberData
          }
        });
      }
      
      // Inserti za membership_details tablicu
      for (const detail of backupData.membership_details) {
        const { detail_id, ...detailData } = detail;
        
        await tx.membershipDetails.create({
          data: {
            ...detailData
          }
        });
      }
      
      // Slično za ostale tablice...
      
      console.log('✅ Podaci uspješno vraćeni iz backupa');
    }, {
      timeout: 12000 // 12 sekundi - ispod Prisma Accelerate limita od 15s
    });
    
    res.json({
      success: true,
      message: 'Podaci uspješno vraćeni iz backupa',
      backupInfo: {
        filename,
        timestamp: backupData.timestamp,
        tables: Object.keys(backupData)
      },
      timestamp: getCurrentDate()
    });
  } catch (error) {
    console.error('❌ Greška prilikom vraćanja backupa:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Nepoznata greška',
      timestamp: getCurrentDate()
    });
  }
});

// Endpoint za listanje dostupnih backupa
router.get('/list-backups', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    
    try {
      await fsPromises.access(backupDir, fs.constants.F_OK);
    } catch (err) {
      // Ako direktorij ne postoji, kreiraj ga
      await fsPromises.mkdir(backupDir, { recursive: true });
      return res.json({ backups: [] });
    }
    
    const files = await fsPromises.readdir(backupDir);
    const backupFiles = files.filter(f => f.endsWith('.json'));
    
    // Sortiraj po vremenu kreiranja, najnoviji prvo
    const backups = await Promise.all(backupFiles.map(async (filename) => {
      const filePath = path.join(backupDir, filename);
      const stats = await fsPromises.stat(filePath);
      
      // Pokušaj pročitati timestamp iz datoteke
      let fileTimestamp = null;
      try {
        const data = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        fileTimestamp = data.timestamp;
      } catch (err) {
        // Ignoriramo grešku
      }
      
      return {
        filename,
        created: stats.ctime,
        size: stats.size,
        timestamp: fileTimestamp
      };
    }));
    
    // Sortiraj po vremenu kreiranja, najnoviji prvo
    backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    
    res.json({ backups });
  } catch (error) {
    console.error('Greška prilikom listanja backupa:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    });
  }
});

// Endpoint za čišćenje testnih podataka iz membership_periods tablice
router.post('/cleanup-test-data', authMiddleware, roles.requireAdmin, async (req, res) => {
  // Dozvoljavamo čišćenje samo u development okruženju
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'Čišćenje testnih podataka je dopušteno samo u razvojnom okruženju' 
    });
  }

  try {
    console.log('🧹 Čišćenje testnih podataka iz baze...');
    
    // Brisanje testnih podataka iz membership_periods
    const deletedPeriods = await prisma.membershipPeriod.findMany({
      where: {
        is_test_data: true
      },
      select: {
        member_id: true
      }
    });
    
    const result = await prisma.membershipPeriod.deleteMany({
      where: {
        is_test_data: true
      }
    });
    
    const affectedMembers = deletedPeriods.map(period => period.member_id).filter(id => id !== null) as number[];
    const uniqueMembers = [...new Set(affectedMembers)];
    
    console.log(`✅ Obrisano ${result.count} testnih zapisa za ${uniqueMembers.length} članova`);
    
    // Ponovno izračunavanje statusa za članove čiji su podaci očišćeni
    if (uniqueMembers.length > 0) {
      console.log(`🔄 Ažuriranje statusa za ${uniqueMembers.length} članova...`);
      
      // Za svakog člana provjeravamo ima li aktivnih razdoblja i po potrebi ažuriramo status
      for (const memberId of uniqueMembers) {
        const activePeriodsResult = await prisma.membershipPeriod.findMany({
          where: {
            member_id: memberId,
            end_date: null
          }
        });
        
        const activeCount = activePeriodsResult.length;
        
        // Ako nema aktivnih perioda nakon čišćenja, onemogući člana
        // Ako nema aktivnih perioda, status 'inactive' je izveden i NE zapisuje se u tablicu
        if (activeCount === 0) {
          console.log(`🚫 Član ${memberId} nema aktivnih razdoblja - status 'inactive' je izveden, ne zapisuje se u bazu.`);
          // Ovdje po potrebi možeš postaviti na 'pending' ako želiš, ali 'inactive' se ne zapisuje.
        } else {
          console.log(`✅ Član ${memberId} ima ${activeCount} aktivnih razdoblja - postavljanje na 'registered'`);
          await prisma.member.update({
            where: {
              member_id: memberId
            },
            data: {
              status: 'registered'
            }
          });
        }
      }
    }
    
    // Šaljemo odgovor s rezultatima
    res.json({
      success: true,
      message: `Uspješno očišćeni testni podaci`,
      details: {
        deletedRecords: result.count,
        affectedMembers: uniqueMembers.length,
        memberIds: uniqueMembers
      },
      timestamp: getCurrentDate()
    });
    
  } catch (error) {
    console.error('❌ Greška prilikom čišćenja testnih podataka:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Nepoznata greška',
      timestamp: getCurrentDate()
    });
  }
});

// Funkcija za brisanje svih datoteka iz direktorija
async function cleanDirectory(directory: string): Promise<void> {
  try {
    // Provjeri postoji li direktorij
    await fsPromises.access(directory);
    
    // Pročitaj sadržaj direktorija
    const files = await fsPromises.readdir(directory);
    
    // Obriši svaku datoteku
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fsPromises.stat(filePath);
      
      if (stats.isDirectory()) {
        // Rekurzivno obriši poddirektorije
        await cleanDirectory(filePath);
        await fsPromises.rmdir(filePath);
      } else {
        // Obriši datoteku
        await fsPromises.unlink(filePath);
      }
    }
  } catch (error: any) {
    // Ako direktorij ne postoji, to je OK
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

// Funkcija za sortiranje datoteka po vremenu promjene (od najnovije do najstarije)
function sortFilesByDate(a: { mtime: Date }, b: { mtime: Date }): number {
  return b.mtime.getTime() - a.mtime.getTime();
}

export default router;
