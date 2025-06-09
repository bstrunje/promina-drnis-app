# Konfiguracija sigurnosnih kopija baze podataka

Ovaj dokument opisuje kako konfigurirati redovite sigurnosne kopije baze podataka za Promina-Drnis aplikaciju, kako lokalno tako i u produkcijskom okruženju na Render platformi.

## Lokalne sigurnosne kopije

Za stvaranje sigurnosne kopije lokalno, koristite sljedeću naredbu:

```bash
npm run backup
```

Ova naredba će stvoriti JSON sigurnosnu kopiju svih podataka iz baze i spremiti je u direktorij `backend/backups`. Zadržava se maksimalno 7 najnovijih sigurnosnih kopija.

## Vraćanje sigurnosne kopije

Za vraćanje sigurnosne kopije, koristite sljedeću naredbu:

```bash
npm run restore
```

Skripta će prikazati popis dostupnih sigurnosnih kopija i zatražiti da odaberete koju želite vratiti. **UPOZORENJE**: Vraćanje sigurnosne kopije će obrisati sve postojeće podatke u bazi.

## Konfiguracija automatskih sigurnosnih kopija na Render platformi

Za konfiguraciju automatskih sigurnosnih kopija na Render platformi, potrebno je postaviti Cron Job koji će redovito pokretati skriptu za sigurnosne kopije.

### Korak 1: Dodavanje potrebnih varijabli okoline

Dodajte sljedeće varijable okoline u Render Dashboard za vaš backend servis:

- `BACKUP_ENABLED`: Postavite na `true` za omogućavanje automatskih sigurnosnih kopija
- `BACKUP_WEBHOOK_URL` (opcionalno): URL za slanje obavijesti o statusu sigurnosne kopije

### Korak 2: Konfiguracija Cron Job-a na Render platformi

1. Prijavite se u Render Dashboard
2. Odaberite "New" > "Cron Job"
3. Unesite sljedeće podatke:
   - **Name**: Promina-Drnis Database Backup
   - **Command**: `node dist/scripts/scheduledBackup.js`
   - **Schedule**: `0 2 * * *` (svaki dan u 2:00 ujutro)
   - **Environment**: Odaberite isto okruženje kao i za backend servis

### Korak 3: Konfiguracija pohrane sigurnosnih kopija

Budući da Render ima read-only filesystem u produkciji, sigurnosne kopije se privremeno spremaju u `/tmp` direktorij. Za trajno pohranjivanje, potrebno je konfigurirati vanjski servis za pohranu.

#### Opcija 1: Amazon S3

Za konfiguraciju pohrane na Amazon S3, dodajte sljedeće varijable okoline:

```
BACKUP_STORAGE=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
S3_BUCKET_NAME=your_bucket_name
```

#### Opcija 2: Google Cloud Storage

Za konfiguraciju pohrane na Google Cloud Storage, dodajte sljedeće varijable okoline:

```
BACKUP_STORAGE=gcs
GOOGLE_APPLICATION_CREDENTIALS=path_to_credentials_file
GCS_BUCKET_NAME=your_bucket_name
```

#### Opcija 3: FTP/SFTP

Za konfiguraciju pohrane putem FTP/SFTP, dodajte sljedeće varijable okoline:

```
BACKUP_STORAGE=ftp
FTP_HOST=your_ftp_host
FTP_PORT=your_ftp_port
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_PATH=your_ftp_path
```

## Implementacija pohrane sigurnosnih kopija

Za implementaciju pohrane sigurnosnih kopija na vanjski servis, potrebno je ažurirati funkciju `uploadBackupToExternalService` u datoteci `src/scripts/backupDatabase.ts`. Trenutno je implementirana samo simulacija slanja, ali možete dodati stvarnu implementaciju prema vašim potrebama.

Primjer implementacije za Amazon S3:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

async function uploadBackupToExternalService(backupFilePath, backupFileName) {
  const storageType = process.env.BACKUP_STORAGE || 'none';
  
  if (storageType === 'none') {
    console.log('Vanjski servis za pohranu nije konfiguriran.');
    return false;
  }
  
  if (storageType === 's3') {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    const fileContent = await fs.promises.readFile(backupFilePath);
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `backups/${backupFileName}`,
      Body: fileContent
    };
    
    try {
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      console.log(`Sigurnosna kopija uspješno poslana na S3: ${backupFileName}`);
      return true;
    } catch (error) {
      console.error('Greška prilikom slanja sigurnosne kopije na S3:', error);
      return false;
    }
  }
  
  // Implementacija za druge servise...
  
  return false;
}
```

## Preporuke za sigurnosne kopije

1. **Redovite sigurnosne kopije**: Konfigurirajte cron job da se izvršava barem jednom dnevno
2. **Višestruke lokacije**: Pohranite sigurnosne kopije na više različitih lokacija
3. **Testiranje vraćanja**: Redovito testirajte proces vraćanja sigurnosne kopije
4. **Monitoring**: Postavite obavijesti za neuspjele sigurnosne kopije
5. **Rotacija**: Zadržite razuman broj sigurnosnih kopija (npr. dnevne za posljednjih 7 dana, tjedne za posljednja 4 tjedna, mjesečne za posljednjih 12 mjeseci)

## Dodatne napomene

- Sigurnosne kopije su u JSON formatu i sadrže sve podatke iz baze
- Skripte automatski čiste stare sigurnosne kopije (zadržava se zadnjih 7)
- U produkcijskom okruženju, sigurnosne kopije se privremeno spremaju u `/tmp` direktorij
- Za trajno pohranjivanje, potrebno je konfigurirati vanjski servis za pohranu

## Pravila za održavanje skripti za sigurnosne kopije

### 1. Ažuriranje pri promjeni sheme podataka

Pri svakoj promjeni Prisma sheme ili dodavanju novih tablica/modela, obavezno ažurirati skripte za sigurnosne kopije (`backupDatabase.ts` i `restoreDatabase.ts`) kako bi uključivale nove vrste podataka. Ovo uključuje:

- Dodavanje novih modela u `backupDatabase.ts` za dohvat podataka
- Ažuriranje redoslijeda brisanja i ponovnog unosa u `restoreDatabase.ts` kako bi se poštivala referencijalnih integriteta
- Provjeru transformacija specifičnih tipova podataka (datumi, decimalni brojevi, itd.)

### 2. Testiranje nakon promjena

Nakon svake promjene u skriptama za sigurnosne kopije:

- Obavezno testirati cijeli proces stvaranja sigurnosne kopije
- Testirati proces vraćanja sigurnosne kopije u testnom okruženju
- Provjeriti jesu li svi podaci ispravno sačuvani i vraćeni

### 3. Dokumentacija promjena

Sve promjene u strukturi podataka koje zahtijevaju ažuriranje skripti za sigurnosne kopije potrebno je dokumentirati:

- Dodati komentar u skripte koji opisuje promjenu i datum
- Ažurirati ovu dokumentaciju ako su potrebne promjene u procedurama
- Obavijestiti tim o promjenama u procesu sigurnosnih kopija
