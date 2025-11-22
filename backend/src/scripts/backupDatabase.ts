// scripts/backupDatabase.ts
// Skripta za stvaranje sigurnosnih kopija baze podataka
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { put, list, del } from '@vercel/blob';

// Učitaj .env varijable
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// Funkcija za formatiranje datuma u obliku YYYY-MM-DD_HH-MM-SS
function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

async function createBackupDirectory() {
  // Za Render, koristimo privremeni direktorij jer imamo read-only filesystem
  // u produkciji, ali možemo koristiti /tmp direktorij
  const backupDir = process.env.NODE_ENV === 'production' 
    ? '/tmp/managemembers-backups' 
    : path.join(__dirname, '..', '..', 'backups');
  
  try {
    await fs.access(backupDir);
  } catch (_error) {
    // Direktorij ne postoji, kreiraj ga
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`Kreiran direktorij za sigurnosne kopije: ${backupDir}`);
  }
  return backupDir;
}

// Funkcija za slanje sigurnosne kopije na Vercel Blob (produkciono trajno spremište)
async function uploadBackupToExternalService(backupFilePath: string, backupFileName: string, orgSegment?: string): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('[BACKUP] BLOB_READ_WRITE_TOKEN is not set. Skipping external upload');
    return false;
  }

  // Pročitaj datoteku u memoriju i pošalji na Blob
  const fileBuffer = await fs.readFile(backupFilePath);
  const prefix = process.env.BACKUP_PREFIX && process.env.BACKUP_PREFIX.length > 0 ? process.env.BACKUP_PREFIX : 'backups';

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const orgPath = orgSegment && orgSegment.length > 0 ? `${orgSegment}/` : '';
  const objectName = `${prefix}/${orgPath}${year}/${month}/${backupFileName}`;

  const result = await put(objectName, fileBuffer, {
    access: 'public',
    token: token,
    contentType: 'application/json'
  });

  // Nakon uspješnog uploada, obriši lokalni /tmp file
  try {
    await fs.unlink(backupFilePath);
  } catch (err) {
    // U produkciji ignoriramo grešku (datoteka možda već ne postoji)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[BACKUP] Failed to remove local temp file:', err);
    }
  }

  console.log(`[BACKUP] Uploaded to Vercel Blob: ${result.url}`);
  return true;
}

// Funkcija za dohvat podataka iz baze i stvaranje JSON sigurnosne kopije
// Ažurirano: uključuje consumed_card_numbers i password_update_queue tablice
async function backupDatabaseToJson(organization?: { id?: number | null; slug?: string | null }) {
  try {
    const backupDir = await createBackupDirectory();
    const timestamp = getFormattedDate();
    const orgId = organization?.id ?? null;
    const orgSlug = organization?.slug ?? null;
    const tenantLabel = orgSlug || (orgId !== null && orgId !== undefined ? `org-${orgId}` : 'global');
    const backupFileName = `promina_drnis_${tenantLabel}_backup_${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    console.log('Dohvaćanje podataka iz baze...');
    
    // Dohvati sve podatke (globalno ili per-tenant)
    const backup = {
      timestamp: new Date().toISOString(),
      data: {} as Record<string, unknown[]>
    };
    
    // Dohvati članove (per-tenant)
    const members = await prisma.member.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    backup.data.members = members;
    console.log(`Dohvaćeno ${backup.data.members.length} članova`);
    
    // Dohvati aktivnosti
    backup.data.activities = await prisma.activity.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.activities.length} aktivnosti`);
    
    // Dohvati tipove aktivnosti
    backup.data.activityTypes = await prisma.activityType.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.activityTypes.length} tipova aktivnosti`);
    
    // Dohvati sudionike aktivnosti
    backup.data.activityParticipants = await prisma.activityParticipation.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.activityParticipants.length} sudionika aktivnosti`);
    
    // Dohvati sistemske postavke
    backup.data.systemSettings = await prisma.systemSettings.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.systemSettings.length} sistemskih postavki`);
    
    // Dohvati detalje članstva (po member_id)
    const memberIds = members.map(m => m.member_id);
    backup.data.membershipDetails = await prisma.membershipDetails.findMany({
      where: orgId ? { member_id: { in: memberIds } } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.membershipDetails.length} detalja članstva`);
    
    // Dohvati periode članstva
    backup.data.membershipPeriods = await prisma.membershipPeriod.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.membershipPeriods.length} perioda članstva`);
    
    // Dohvati poruke članova
    backup.data.memberMessages = await prisma.memberMessage.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.memberMessages.length} poruka članova`);
    
    // Dohvati statuse primatelja poruka (po relaciji na message)
    backup.data.messageRecipientStatuses = await prisma.messageRecipientStatus.findMany({
      where: orgId ? { message: { organization_id: orgId } } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.messageRecipientStatuses.length} statusa primatelja poruka`);
    
    // Dohvati inventar markica
    backup.data.stampInventory = await prisma.stampInventory.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.stampInventory.length} inventara markica`);
    
    // Dohvati brojeve iskaznica
    backup.data.cardNumbers = await prisma.cardNumber.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.cardNumbers.length} brojeva iskaznica`);

    // Dohvati potrošene brojeve kartica
    backup.data.consumedCardNumbers = await prisma.consumedCardNumber.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.consumedCardNumbers.length} potrošenih brojeva kartica`);

    // Dohvati queue za promjenu lozinke (po member_id)
    backup.data.passwordUpdateQueue = await prisma.password_update_queue.findMany({
      where: orgId ? { member_id: { in: memberIds } } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.passwordUpdateQueue.length} zahtjeva za promjenu lozinke`);
    
    // Dohvati godišnje statistike
    backup.data.annualStatistics = await prisma.annualStatistics.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.annualStatistics.length} godišnjih statistika`);
    
    // Dohvati audit logove
    backup.data.auditLogs = await prisma.auditLog.findMany({
      where: orgId ? { organization_id: orgId } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.auditLogs.length} audit logova`);
    
    // Dohvati dozvole članova (po member_id)
    backup.data.memberPermissions = await prisma.memberPermissions.findMany({
      where: orgId ? { member_id: { in: memberIds } } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.memberPermissions.length} dozvola članova`);
    
    // Dohvati refresh tokene (po member_id)
    backup.data.refreshTokens = await prisma.refresh_tokens.findMany({
      where: orgId ? { member_id: { in: memberIds } } : undefined
    });
    console.log(`Dohvaćeno ${backup.data.refreshTokens.length} refresh tokena`);
    
    // Zapiši sigurnosnu kopiju u datoteku
    await fs.writeFile(backupFilePath, JSON.stringify(backup, null, 2));
    console.log(`Sigurnosna kopija uspješno kreirana: ${backupFilePath}`);
    
    // Pošalji sigurnosnu kopiju na vanjski servis ako smo u produkciji
    if (process.env.NODE_ENV === 'production') {
      const orgSegment = orgSlug || (orgId !== null && orgId !== undefined ? `org-${orgId}` : undefined);
      await uploadBackupToExternalService(backupFilePath, backupFileName, orgSegment ?? undefined);

      // Retention nad Vercel Blob i update lastBackupAt (per-tenant ako postoji orgId)
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token) {
        try {
          if (orgId !== null && orgId !== undefined) {
            const s = await prisma.systemSettings.findUnique({ where: { organization_id: orgId } });
            const retention = s?.backupRetentionDays ?? Number(process.env.BACKUP_RETENTION_DAYS ?? 7);
            await prisma.systemSettings.update({ where: { organization_id: orgId }, data: { lastBackupAt: new Date() } });
            if (retention && retention > 0) {
              const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
              const prefix = process.env.BACKUP_PREFIX && process.env.BACKUP_PREFIX.length > 0 ? process.env.BACKUP_PREFIX : 'backups';
              const base = orgSegment && orgSegment.length > 0 ? `${prefix}/${orgSegment}/` : `${prefix}/`;
              const { blobs } = await list({ prefix: base, token });
              for (const b of blobs) {
                // Očekivani format imena: promina_drnis_<tenantLabel>_backup_YYYY-MM-DD_HH-mm-ss.json
                const name = b.pathname.split('/').pop() || '';
                const ts = name.substring(name.lastIndexOf('_backup_') + 8, name.length - 5).replace('_', ' ').replace(/-/g, ':');
                // Pretvori "YYYY:MM:DD HH:mm:ss" natrag u datum
                const parts = ts.split(' ');
                if (parts.length === 2) {
                  const d = parts[0].replace(/:/g, '-');
                  const t = parts[1].replace(/:/g, ':');
                  const parsed = Date.parse(`${d}T${t}Z`);
                  if (!Number.isNaN(parsed) && parsed < cutoff) {
                    try {
                      await del(b.url, { token });
                    } catch (err) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('[BACKUP] Failed to delete old blob:', b.url, err);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('[BACKUP] Blob retention cleanup skipped:', e);
        }
      }
    }
    
    // Čišćenje starih sigurnosnih kopija (opcijsko)
    await cleanupOldBackups(backupDir);
    
    return {
      success: true,
      filePath: backupFilePath,
      fileName: backupFileName,
      timestamp: backup.timestamp
    };
  } catch (error: unknown) {
    console.error('Greška prilikom stvaranja sigurnosne kopije:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Funkcija za brisanje starih sigurnosnih kopija (zadržava zadnjih 7)
async function cleanupOldBackups(backupDir: string): Promise<void> {
  try {
    const files = await fs.readdir(backupDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length <= 7) {
      return; // Nema potrebe za brisanjem ako imamo 7 ili manje datoteka
    }
    
    // Sortiraj datoteke po datumu (najnovije prvo)
    const fileStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        return { file, stats };
      })
    );
    
    fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
    
    // Zadrži samo zadnjih 7 sigurnosnih kopija
    const filesToDelete = fileStats.slice(7).map(item => item.file);
    
    for (const file of filesToDelete) {
      await fs.unlink(path.join(backupDir, file));
      console.log(`Obrisana stara sigurnosna kopija: ${file}`);
    }
  } catch (error) {
    console.error('Greška prilikom čišćenja starih sigurnosnih kopija:', error);
  }
}

// Ako se skripta pokreće direktno, izvrši sigurnosnu kopiju
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  backupDatabaseToJson().then(result => {
    if (result.success) {
      console.log('Sigurnosna kopija uspješno kreirana');
      process.exit(0);
    } else {
      console.error('Greška prilikom stvaranja sigurnosne kopije');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Neočekivana greška:', error);
    process.exit(1);
  });
}

export default backupDatabaseToJson;
