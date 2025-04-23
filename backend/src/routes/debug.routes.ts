import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import util from 'util';
import { promises as fsPromises } from 'fs';

// Import the database client
import db from '../utils/db.js';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// Debug endpoint to check if file exists
router.get('/file-exists/:subdirectory/:filename', async (req, res) => {
  try {
    const { subdirectory, filename } = req.params;
    const filePath = path.join(__dirname, '..', '..', 'uploads', subdirectory, filename);
    
    console.log('Checking if file exists:', filePath);
    
    try {
      const stats = await fs.stat(filePath);
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
    const content = `Test file created at ${new Date().toISOString()}`;
    
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
      const membersResult = await db.query('SELECT * FROM members');
      const membershipDetailsResult = await db.query('SELECT * FROM membership_details');
      const membershipPeriodsResult = await db.query('SELECT * FROM membership_periods');
      const stampInventoryResult = await db.query('SELECT * FROM stamp_inventory');
      const activitiesResult = await db.query('SELECT * FROM activities');
      const activityParticipantsResult = await db.query('SELECT * FROM activity_participants');
      
      // Spremamo u backup objekt
      backupData = {
        timestamp: new Date().toISOString(),
        members: membersResult.rows,
        membership_details: membershipDetailsResult.rows,
        membership_periods: membershipPeriodsResult.rows,
        stamp_inventory: stampInventoryResult.rows,
        activities: activitiesResult.rows,
        activity_participants: activityParticipantsResult.rows
      };
      
      // Spašavamo backup u datoteku
      const backupDir = path.join(__dirname, '..', '..', 'backups');
      await fsPromises.mkdir(backupDir, { recursive: true });
      
      const backupFileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
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
    
    // Koristimo transakciju za sigurno izvođenje svih izmjena
    await db.transaction(async (client) => {
      // 1. RESETIRANJE KORISNIKA I ČLANSTVA
      
      // Vraćanje statusa svih članova na "registered" (početni status)
      await client.query(`
        UPDATE members 
        SET status = 'registered'
      `);
      
      // Resetiranje podataka o prijavi i blokadama članova
      await client.query(`
        UPDATE members 
        SET 
          status = 'registered'
      `);
      
      // Vraćanje početnih uloga (opcija - ako želite zadržati specifične uloge za testiranje, ovo možete zakomentirati)
      // await client.query(`
      //   UPDATE members 
      //   SET role = 'member'
      //   WHERE role != 'admin' AND role != 'superuser'
      // `);
      
      // 2. RESETIRANJE ČLANARINA I PERIODA
      
      // Vraćanje članarina na trenutnu godinu i poništavanje datuma plaćanja
      const currentYear = new Date().getFullYear();
      await client.query(`
        UPDATE membership_details 
        SET 
          fee_payment_year = $1,
          fee_payment_date = NULL,
          card_stamp_issued = false,
          next_year_stamp_issued = false
      `, [currentYear]);
      
      // Opcija za zatvaranje/brisanje svih aktivnih perioda članstva i otvaranje novih
      // (zakomentirano jer možete željeti zadržati postojeće periode)
      // await client.query(`
      //   UPDATE membership_periods
      //   SET end_date = CURRENT_DATE, 
      //       end_reason = 'test_reset'
      //   WHERE end_date IS NULL
      // `);
      
      // 3. RESETIRANJE INVENTARA I MARKICA
      
      // Vraćanje inventara markica na početno stanje
      await client.query(`
        UPDATE stamp_inventory 
        SET 
          issued_count = 0
      `);
      
      // 4. RESETIRANJE ČLANSKIH ISKAZNICA
      
      // Opcija - vraćanje svih iskaznica u dostupno stanje (zakomentirati ako želite zadržati dodjele)
      // await client.query(`
      //   UPDATE card_numbers
      //   SET status = 'available', member_id = NULL
      //   WHERE status = 'assigned'
      // `);
      
      // 5. RESETIRANJE AKTIVNOSTI
      
      // Opcija - brisanje svih aktivnosti kreiranih tijekom testiranja
      // Možete definirati vremensku točku (npr. datum) od koje se brišu aktivnosti
      // await client.query(`
      //   DELETE FROM activity_participants
      //   WHERE activity_id IN (
      //     SELECT activity_id FROM activities
      //     WHERE created_at > (CURRENT_DATE - INTERVAL '30 days')
      //   )
      // `);
      
      // await client.query(`
      //   DELETE FROM activities
      //   WHERE created_at > (CURRENT_DATE - INTERVAL '30 days')
      // `);
      
      // 6. RESETIRANJE PORUKA
      
      // Brisanje testnih poruka
      await client.query(`
        DELETE FROM member_messages
        WHERE created_at > (CURRENT_DATE - INTERVAL '1 day')
      `);
      
      // 7. RESETIRANJE RADNIH SATI
      
      // Resetiranje ukupnih sati na 0 ili neku minimalnu vrijednost za sve članove
      // (zakomentirano jer vjerojatno želite zadržati sate članova)
      // await client.query(`
      //   UPDATE members
      //   SET total_hours = 0
      // `);
      
      // 8. RESETIRANJE UPDATE QUEUE-a
      
      // Brisanje svih stavki iz reda čekanja za ažuriranje lozinki
      await client.query(`
        DELETE FROM password_update_queue
      `);
      
      console.log('✅ Baza podataka uspješno resetirana na početno stanje');
    });
    
    // Vraćamo uspješan odgovor s informacijom o backup-u
    res.json({ 
      success: true, 
      message: 'Testna baza podataka uspješno resetirana',
      backupCreated: backupData.timestamp ? true : false,
      backupTimestamp: backupData.timestamp || null,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Greška prilikom resetiranja baze:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Nepoznata greška',
      timestamp: new Date()
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
    await db.transaction(async (client) => {
      // Primjer vraćanja podataka za members tablicu
      // Ovo je kompleksno jer treba pažljivo obraditi svaki redak i polje
      // Ovdje je pojednostavljeni pristup za members tablicu
      
      console.log('🔄 Vraćanje podataka za članove...');
      
      // Prvo brisanje podataka iz tablica koje imaju strane ključeve
      await client.query('DELETE FROM password_update_queue');
      await client.query('DELETE FROM activity_participants');
      await client.query('DELETE FROM annual_statistics');
      await client.query('DELETE FROM audit_logs');
      await client.query('DELETE FROM member_messages');
      await client.query('DELETE FROM admin_permissions');
      
      // Brisanje postojećih podataka iz membership_details (foreign key constraint)
      await client.query('DELETE FROM membership_details');

      // Brisanje postojećih podataka iz members
      await client.query('DELETE FROM members');
      
      // Inserti za members tablicu
      for (const member of backupData.members) {
        const fields = Object.keys(member).filter(k => k !== 'member_id');
        const values = fields.map(f => member[f]);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        
        await client.query(`
          INSERT INTO members (${fields.join(', ')})
          VALUES (${placeholders})
        `, values);
      }
      
      // Inserti za membership_details tablicu
      for (const detail of backupData.membership_details) {
        const fields = Object.keys(detail).filter(k => k !== 'detail_id');
        const values = fields.map(f => detail[f]);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        
        await client.query(`
          INSERT INTO membership_details (${fields.join(', ')})
          VALUES (${placeholders})
        `, values);
      }
      
      // Slično za ostale tablice...
      
      console.log('✅ Podaci uspješno vraćeni iz backupa');
    });
    
    res.json({
      success: true,
      message: 'Podaci uspješno vraćeni iz backupa',
      backupInfo: {
        filename,
        timestamp: backupData.timestamp,
        tables: Object.keys(backupData)
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Greška prilikom vraćanja backupa:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Nepoznata greška',
      timestamp: new Date()
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

export default router;
