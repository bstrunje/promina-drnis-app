/**
 * date-standardization-frontend-v2.js
 * 
 * Poboljšana skripta za standardizaciju korištenja datuma u frontend dijelu Promina-Drnis aplikacije.
 * Fokusira se na React/TypeScript specifične probleme i poboljšanje korisničkog iskustva.
 * 
 * Glavna poboljšanja:
 * - Ispravljen naziv datoteke (dateUtils umjesto date-utils)
 * - Zaštita od rekurzivnih poziva u getCurrentDate
 * - Bolja detekcija konteksta varijabli
 * - Provjera postojanja modula prije zamjene
 * 
 * Pokretanje: node date-standardization-frontend-v2.js [--fix] [--dry-run] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { CONFIG, UTILS, COMMON_PATTERNS, findFilesWithPattern, applyTransformations } = require('./date-standardization-common-v2.js');

// Frontend specifični obrasci za pretraživanje
const FRONTEND_PATTERNS = {
  // Zamjena direktnog korištenja new Date() s getCurrentDate()
  // Ali samo ako NISMO unutar getCurrentDate funkcije
  newDateReplacement: {
    pattern: /(?<!export\s+function\s+getCurrentDate[\s\S]*?)new\s+Date\(\)/g,
    replacement: 'getCurrentDate()',
    description: 'Zamjena new Date() s getCurrentDate() (sigurna verzija)'
  },
  
  // Problem s direktnim korištenjem .toLocaleString()
  toLocaleString: {
    pattern: /(\w+)\.toLocaleString\(['"]hr-HR['"]\)/g,
    replacement: (match, varName) => {
      return `formatDate(${varName}, 'dd.MM.yyyy.')`;
    },
    description: 'Zamjena .toLocaleString() s formatDate()'
  },

  // Problem s direktnim korištenjem .toISOString()
  toISOString: {
    pattern: /(\w+)\.toISOString\(\)/g,
    replacement: (match, varName) => {
      return `formatDate(${varName}, 'yyyy-MM-dd\\'T\\'HH:mm:ss.SSS\\'Z\\'')`;
    },
    description: 'Zamjena .toISOString() s formatDate()'
  },
  
  // Problem s korištenjem moment.js umjesto dateUtils
  momentUsage: {
    pattern: /import\s+moment\s+from\s+['"](moment)['"];?/g,
    replacement: `// Zamijenjen moment.js s dateUtils
import { formatDate, parseDate, getCurrentDate } from '../utils/dateUtils';`,
    description: 'Zamjena moment.js s dateUtils'
  },
  
  // Problem s korištenjem moment().format()
  momentFormat: {
    pattern: /moment\((\w+)\)\.format\(['"]([^'"]+)['"]\)/g,
    replacement: (match, varName, format) => {
      // Konvertiraj moment.js format u date-fns format
      let dateFnsFormat = format
        .replace('DD', 'dd')
        .replace('YYYY', 'yyyy')
        .replace('YY', 'yy')
        .replace('MMM', 'LLL')
        .replace('MM', 'MM')
        .replace('HH', 'HH')
        .replace('mm', 'mm')
        .replace('ss', 'ss');
      
      return `formatDate(${varName}, '${dateFnsFormat}')`;
    },
    description: 'Zamjena moment().format() s formatDate()'
  },
  
  // Problem s rekurzivnim pozivom u getCurrentDate
  fixGetCurrentDateRecursion: {
    pattern: /export\s+function\s+getCurrentDate\s*\(\)[^{]*{\s*if\s*\([^)]*\)\s*{\s*return[^;]*;\s*}\s*return\s+getCurrentDate\(\);/g,
    replacement: `export function getCurrentDate(): Date {
  if (mockDate) {
    return mockDate;
  }
  return new Date();`,
    description: 'Ispravljanje rekurzivnog poziva u getCurrentDate funkciji'
  },
  
  // Problem s nepostojećim importom
  fixBadImports: {
    pattern: /import\s+{\s*getCurrentDate\s*}\s+from\s+['"]\/date-utils['"];?/g,
    replacement: '',
    description: 'Uklanjanje nepostojećih importa'
  }
};

/**
 * Funkcija za ispravak problema sa specifičnim komponentama
 */
function fixFrontendComponents() {
  console.log('\n🔧 Ispravak problema s formatiranjem datuma u React komponentama...');
  
  // Pronađi sve komponente
  const componentFiles = findFilesWithPattern(CONFIG.frontendSrc, /\.(tsx|jsx)$/i);
  console.log(`Pronađeno ${componentFiles.length} React komponenti za provjeru.`);
  
  let modifiedFiles = 0;
  
  // Provjeri svaku komponentu
  for (const file of componentFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Provjeri sadrži li datoteka problematične obrasce
      let needsFormatDate = false;
      let needsParseDate = false;
      let needsGetCurrentDate = false;
      
      // Provjera za .toLocaleString()
      if (/\.toLocaleString\(/.test(content)) {
        needsFormatDate = true;
      }
      
      // Provjera za .toISOString()
      if (/\.toISOString\(/.test(content)) {
        needsFormatDate = true;
      }
      
      // Provjera za new Date()
      if (/new\s+Date\(\)/.test(content)) {
        needsGetCurrentDate = true;
      }
      
      // Provjera za Date parsing
      if (/new\s+Date\([^)]+\)/.test(content) && !/getCurrentDate\(/.test(content)) {
        needsParseDate = true;
      }
      
      // Primijeni transformacije
      const transformations = { ...COMMON_PATTERNS, ...FRONTEND_PATTERNS };
      const { content: newContent, modified } = applyTransformations(content, transformations, file);
      
      // Dodaj potrebne importe ako nedostaju
      let finalContent = newContent;
      let importsModified = false;
      
      if (needsFormatDate && !UTILS.hasDateUtilsImport(finalContent, 'formatDate')) {
        finalContent = UTILS.addDateUtilsImport(finalContent, 'formatDate');
        importsModified = true;
      }
      
      if (needsParseDate && !UTILS.hasDateUtilsImport(finalContent, 'parseDate')) {
        finalContent = UTILS.addDateUtilsImport(finalContent, 'parseDate');
        importsModified = true;
      }
      
      if (needsGetCurrentDate && !UTILS.hasDateUtilsImport(finalContent, 'getCurrentDate')) {
        finalContent = UTILS.addDateUtilsImport(finalContent, 'getCurrentDate');
        importsModified = true;
      }
      
      // Ako su napravljene izmjene, spremi datoteku
      if (modified || importsModified) {
        console.log(`🔄 Pronađene potrebne promjene u ${file}`);
        modifiedFiles++;
        
        // Ako je fix mode, spremi promjene
        if (CONFIG.fix && !CONFIG.dryRun) {
          // Napravi backup prvo
          const backupPath = UTILS.createBackup(file);
          console.log(`  📦 Napravljena sigurnosna kopija: ${backupPath}`);
          
          // Spremi promjene
          fs.writeFileSync(file, finalContent, 'utf8');
          console.log(`  💾 Spremljene promjene u ${file}`);
        } else if (CONFIG.dryRun) {
          console.log(`  🔍 [DRY RUN] Promjene NISU spremljene. Koristi --fix za spremanje.`);
        }
      }
    } catch (error) {
      console.error(`❌ Greška pri obradi ${file}:`, error);
    }
  }
  
  console.log(`✅ Modificirano ${modifiedFiles} React komponenti.`);
}

/**
 * Funkcija za ispravak problema s formatiranjem datuma u frontend aplikaciji
 */
function fixFrontendDateFormatting() {
  console.log('\n🔧 Ispravak problema s formatiranjem datuma u frontend aplikaciji...');
  
  // Pronađi sve TypeScript datoteke u src/utils direktoriju
  const utilsFiles = findFilesWithPattern(path.join(CONFIG.frontendSrc, 'utils'), /\.(ts|tsx)$/i);
  console.log(`Pronađeno ${utilsFiles.length} utility datoteka za provjeru.`);
  
  // Posebno provjeri dateUtils.ts
  const dateUtilsPath = path.join(CONFIG.frontendSrc, 'utils', 'dateUtils.ts');
  if (fs.existsSync(dateUtilsPath)) {
    console.log(`🔍 Provjera dateUtils.ts...`);
    
    try {
      const content = fs.readFileSync(dateUtilsPath, 'utf8');
      
      // Provjeri ima li rekurzivni poziv u getCurrentDate
      if (UTILS.checkForRecursion(content, 'getCurrentDate')) {
        console.log(`⚠️ Pronađen rekurzivni poziv u getCurrentDate funkciji!`);
        
        // Primijeni samo specifične transformacije za dateUtils.ts
        const { content: newContent, modified } = applyTransformations(
          content, 
          { fixGetCurrentDateRecursion: FRONTEND_PATTERNS.fixGetCurrentDateRecursion },
          dateUtilsPath
        );
        
        if (modified) {
          console.log(`🔄 Ispravljen rekurzivni poziv u ${dateUtilsPath}`);
          
          // Ako je fix mode, spremi promjene
          if (CONFIG.fix && !CONFIG.dryRun) {
            // Napravi backup prvo
            const backupPath = UTILS.createBackup(dateUtilsPath);
            console.log(`  📦 Napravljena sigurnosna kopija: ${backupPath}`);
            
            // Spremi promjene
            fs.writeFileSync(dateUtilsPath, newContent, 'utf8');
            console.log(`  💾 Spremljene promjene u ${dateUtilsPath}`);
          } else if (CONFIG.dryRun) {
            console.log(`  🔍 [DRY RUN] Promjene NISU spremljene. Koristi --fix za spremanje.`);
          }
        }
      } else {
        console.log(`✅ Nema rekurzivnog poziva u getCurrentDate funkciji.`);
      }
      
      // Provjeri ima li nepostojećih importa
      if (/import\s+{\s*getCurrentDate\s*}\s+from\s+['"]\/date-utils['"];?/.test(content)) {
        console.log(`⚠️ Pronađen nepostojeći import iz /date-utils!`);
        
        // Primijeni transformaciju za nepostojeći import
        const { content: newContent, modified } = applyTransformations(
          content, 
          { fixBadImports: FRONTEND_PATTERNS.fixBadImports },
          dateUtilsPath
        );
        
        if (modified) {
          console.log(`🔄 Uklonjen nepostojeći import u ${dateUtilsPath}`);
          
          // Ako je fix mode, spremi promjene
          if (CONFIG.fix && !CONFIG.dryRun) {
            // Napravi backup prvo ako već nije napravljen
            if (!fs.existsSync(path.join(path.dirname(dateUtilsPath), '.date-standardization-backups', path.basename(dateUtilsPath)))) {
              const backupPath = UTILS.createBackup(dateUtilsPath);
              console.log(`  📦 Napravljena sigurnosna kopija: ${backupPath}`);
            }
            
            // Spremi promjene
            fs.writeFileSync(dateUtilsPath, newContent, 'utf8');
            console.log(`  💾 Spremljene promjene u ${dateUtilsPath}`);
          } else if (CONFIG.dryRun) {
            console.log(`  🔍 [DRY RUN] Promjene NISU spremljene. Koristi --fix za spremanje.`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Greška pri obradi ${dateUtilsPath}:`, error);
    }
  } else {
    console.warn(`⚠️ Datoteka ${dateUtilsPath} ne postoji!`);
  }
}

/**
 * Funkcija za zamjenu moment.js s date-fns
 */
function replaceMomentWithDateFns() {
  console.log('\n🔄 Zamjena moment.js s date-fns...');
  
  // Pronađi sve datoteke koje koriste moment.js
  const allTsFiles = findFilesWithPattern(CONFIG.frontendSrc, /\.(ts|tsx|js|jsx)$/i);
  console.log(`Provjera ${allTsFiles.length} datoteka za korištenje moment.js...`);
  
  let momentFiles = [];
  
  // Provjeri koje datoteke koriste moment.js
  for (const file of allTsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Provjeri koristi li se moment.js
      if (/import\s+moment\s+from\s+['"]moment['"]/.test(content) || /\bmoment\s*\(/.test(content)) {
        momentFiles.push(file);
      }
    } catch (error) {
      console.error(`❌ Greška pri provjeri ${file}:`, error);
    }
  }
  
  console.log(`Pronađeno ${momentFiles.length} datoteka koje koriste moment.js.`);
  
  // Zamijeni moment.js s date-fns u svakoj datoteci
  for (const file of momentFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Primijeni transformacije za moment.js
      const { content: newContent, modified } = applyTransformations(
        content, 
        {
          momentUsage: FRONTEND_PATTERNS.momentUsage,
          momentFormat: FRONTEND_PATTERNS.momentFormat
        },
        file
      );
      
      if (modified) {
        console.log(`🔄 Zamijenjen moment.js s date-fns u ${file}`);
        
        // Ako je fix mode, spremi promjene
        if (CONFIG.fix && !CONFIG.dryRun) {
          // Napravi backup prvo
          const backupPath = UTILS.createBackup(file);
          console.log(`  📦 Napravljena sigurnosna kopija: ${backupPath}`);
          
          // Spremi promjene
          fs.writeFileSync(file, newContent, 'utf8');
          console.log(`  💾 Spremljene promjene u ${file}`);
        } else if (CONFIG.dryRun) {
          console.log(`  🔍 [DRY RUN] Promjene NISU spremljene. Koristi --fix za spremanje.`);
        }
      }
    } catch (error) {
      console.error(`❌ Greška pri obradi ${file}:`, error);
    }
  }
}

/**
 * Glavna funkcija za frontend standardizaciju
 */
function main() {
  console.log('🚀 Pokretanje frontend standardizacije datuma...');
  console.log(`📂 Frontend direktorij: ${CONFIG.frontendSrc}`);
  console.log(`🔧 Opcije: ${CONFIG.dryRun ? 'dry-run' : ''} ${CONFIG.fix ? 'fix' : ''} ${CONFIG.verbose ? 'verbose' : ''}`);
  
  // Najprije popravi dateUtils.ts - ovo je najkritičnije
  fixFrontendDateFormatting();
  
  // Zatim zamijeni moment.js s date-fns
  replaceMomentWithDateFns();
  
  // Ispravi React komponente
  fixFrontendComponents();
  
  // Na kraju provjeri konzistentnost importa i korištenja
  console.log('\n🔍 Provjera konzistentnosti korištenja dateUtils funkcija...');
  const stats = require('./date-standardization-common-v2').checkDateUtilsConsistency(CONFIG.frontendSrc, { frontendOnly: true });
  
  // Završi s porukom
  console.log('\n✅ Frontend standardizacija datuma završena!');
  
  return stats;
}

// Pokreni skriptu ako je direktno pokrenuta
if (require.main === module) {
  main();
}

// Izvezi funkcije za korištenje u drugim skriptama
module.exports = {
  fixFrontendComponents,
  fixFrontendDateFormatting,
  replaceMomentWithDateFns,
  main
};
