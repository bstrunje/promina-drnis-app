/**
 * Skripta za specifične ispravke u standardizaciji datuma
 * 
 * Ova skripta implementira specifične ispravke za problematične slučajeve
 * koji zahtijevaju složeniju logiku nego što je moguće automatski detektirati
 * 
 * Pokretanje: node date-standardization-fixes.js [--fix]
 */

const fs = require('fs');
const path = require('path');

// Konfiguracijske postavke
const CONFIG = {
  rootDir: path.resolve(__dirname, '..'),
  backendSrc: path.resolve(__dirname, '../backend/src'),
  frontendSrc: path.resolve(__dirname, '../frontend/src'),
  shouldFix: process.argv.includes('--fix'),
  dryRun: process.argv.includes('--dry-run')
};

// Specifični slučajevi za ispravak
const SPECIFIC_FIXES = [
  // Ispravak u membership.service.ts - korištenje getCurrentDate umjesto new Date
  {
    filePath: path.join(CONFIG.backendSrc, 'services/membership.service.ts'),
    description: 'Zamjena new Date() s getCurrentDate() u checkAutoTerminations',
    find: 'const currentYear = new Date().getFullYear();\n      const currentDate = new Date();',
    replace: 'const currentDate = getCurrentDate();\n      const currentYear = currentDate.getFullYear();'
  },
  // Ispravak u scheduledTasks.ts - korištenje getCurrentDate umjesto new Date
  {
    filePath: path.join(CONFIG.backendSrc, 'utils/scheduledTasks.ts'),
    description: 'Zamjena new Date() s getCurrentDate() u initScheduledTasks',
    find: 'const now = new Date();',
    replace: 'const now = getCurrentDate();'
  },
  // Ispravak u memberUtils.ts - korištenje getCurrentDate umjesto new Date
  {
    filePath: path.join(CONFIG.backendSrc, 'utils/memberUtils.ts'),
    description: 'Zamjena new Date() s getCurrentDate() u calculateAge',
    find: 'const today = new Date();',
    replace: 'const today = getCurrentDate();'
  },
  // Ispravak u stamp.service.ts - korištenje getCurrentYear umjesto new Date().getFullYear()
  {
    filePath: path.join(CONFIG.backendSrc, 'services/stamp.service.ts'),
    description: 'Zamjena new Date().getFullYear() s getCurrentYear()',
    find: 'const currentYear = new Date().getFullYear();',
    replace: 'const currentYear = getCurrentYear();'
  },
  // Ispravak u MembershipPeriodsSection.tsx - korištenje formatDate umjesto toLocaleDateString
  {
    filePath: path.join(CONFIG.frontendSrc, 'features/membership/components/MembershipPeriodsSection.tsx'),
    description: 'Zamjena toLocaleDateString s formatDate',
    find: 'value={newPeriod.start_date ? new Date(newPeriod.start_date as string).toLocaleDateString(\'hr-HR\') : \'\'}',
    replace: 'value={newPeriod.start_date ? formatDate(newPeriod.start_date as string, \'dd.MM.yyyy\') : \'\'}'
  },
  {
    filePath: path.join(CONFIG.frontendSrc, 'features/membership/components/MembershipPeriodsSection.tsx'),
    description: 'Zamjena toLocaleDateString s formatDate',
    find: 'value={newPeriod.end_date ? new Date(newPeriod.end_date as string).toLocaleDateString(\'hr-HR\') : \'\'}',
    replace: 'value={newPeriod.end_date ? formatDate(newPeriod.end_date as string, \'dd.MM.yyyy\') : \'\'}'
  },
  // Ispravak u MessageList.tsx - korištenje formatDate umjesto toISOString
  {
    filePath: path.join(CONFIG.frontendSrc, 'features/messages/MessageList.tsx'),
    description: 'Zamjena toISOString s formatDate',
    find: 'const dateWithoutSeconds = new Date(message.created_at).toISOString().slice(0, 16);',
    replace: 'const dateWithoutSeconds = formatDate(message.created_at, \'yyyy-MM-dd\\\'T\\\'HH:mm\');'
  }
];

// Funkcija za primjenu specifičnih ispravaka
function applySpecificFixes() {
  console.log('🔧 Primjenjujem specifične ispravke za standardizaciju datuma...\n');
  
  SPECIFIC_FIXES.forEach(fix => {
    try {
      // Provjeri postoji li datoteka
      if (!fs.existsSync(fix.filePath)) {
        console.log(`❌ Datoteka ne postoji: ${fix.filePath}`);
        return;
      }
      
      // Učitaj sadržaj datoteke
      let content = fs.readFileSync(fix.filePath, 'utf8');
      
      // Provjeri postoji li traženi tekst
      if (!content.includes(fix.find)) {
        console.log(`⚠️ Nije pronađen traženi tekst u: ${fix.filePath}`);
        console.log(`   Opis: ${fix.description}`);
        return;
      }
      
      // Primijeni ispravak
      const newContent = content.replace(fix.find, fix.replace);
      
      // Provjeri je li došlo do promjene
      if (content === newContent) {
        console.log(`⚠️ Nema promjene nakon zamjene u: ${fix.filePath}`);
        return;
      }
      
      // Spremi promjene
      if (CONFIG.shouldFix && !CONFIG.dryRun) {
        fs.writeFileSync(fix.filePath, newContent, 'utf8');
        console.log(`✅ Ispravak primijenjen: ${fix.filePath}`);
        console.log(`   Opis: ${fix.description}`);
      } else {
        console.log(`🔍 Ispravak bi bio primijenjen (${CONFIG.dryRun ? 'dry run' : 'bez --fix'}): ${fix.filePath}`);
        console.log(`   Opis: ${fix.description}`);
      }
    } catch (error) {
      console.error(`❌ Greška pri ispravku ${fix.filePath}: ${error.message}`);
    }
  });
  
  // Provjeri je li potrebno dodati importe
  if (CONFIG.shouldFix || CONFIG.dryRun) {
    addMissingImports();
  }
}

// Funkcija za dodavanje nedostajućih importa
function addMissingImports() {
  console.log('\n🔄 Dodajem nedostajuće importe...');
  
  // Mapa datoteka i potrebnih importa
  const fileImports = {
    [path.join(CONFIG.backendSrc, 'services/membership.service.ts')]: {
      import: "import { getCurrentDate } from '../utils/dateUtils';",
      check: 'getCurrentDate'
    },
    [path.join(CONFIG.backendSrc, 'utils/scheduledTasks.ts')]: {
      import: "import { getCurrentDate } from './dateUtils';",
      check: 'getCurrentDate'
    },
    [path.join(CONFIG.backendSrc, 'utils/memberUtils.ts')]: {
      import: "import { getCurrentDate } from './dateUtils';",
      check: 'getCurrentDate'
    },
    [path.join(CONFIG.backendSrc, 'services/stamp.service.ts')]: {
      import: "import { getCurrentYear } from '../utils/dateUtils';",
      check: 'getCurrentYear'
    },
    [path.join(CONFIG.frontendSrc, 'features/membership/components/MembershipPeriodsSection.tsx')]: {
      import: "import { formatDate } from '../../../utils/dateUtils';",
      check: 'formatDate'
    },
    [path.join(CONFIG.frontendSrc, 'features/messages/MessageList.tsx')]: {
      import: "import { formatDate } from '../../utils/dateUtils';",
      check: 'formatDate'
    }
  };
  
  // Prođi kroz sve datoteke i dodaj importe
  Object.entries(fileImports).forEach(([filePath, importInfo]) => {
    try {
      // Provjeri postoji li datoteka
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Datoteka ne postoji: ${filePath}`);
        return;
      }
      
      // Učitaj sadržaj datoteke
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Provjeri treba li dodati import
      if (content.includes(importInfo.check) && content.includes('dateUtils')) {
        console.log(`✓ Import već postoji u: ${filePath}`);
        return;
      }
      
      // Pronađi mjesto za dodavanje importa (nakon zadnjeg importa)
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        } else if (lastImportIndex !== -1 && !lines[i].trim().startsWith('import ')) {
          break;
        }
      }
      
      // Dodaj import nakon zadnjeg importa
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importInfo.import);
        
        // Spremi promjene
        if (CONFIG.shouldFix && !CONFIG.dryRun) {
          fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
          console.log(`✅ Dodan import u: ${filePath}`);
        } else {
          console.log(`🔍 Import bi bio dodan (${CONFIG.dryRun ? 'dry run' : 'bez --fix'}): ${filePath}`);
        }
      } else {
        console.log(`⚠️ Nije pronađen import blok u: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Greška pri dodavanju importa u ${filePath}: ${error.message}`);
    }
  });
}

// Funkcija za provjeru konzistentnosti korištenja dateUtils
function checkDateUtilsConsistency() {
  console.log('\n🔍 Provjeravam konzistentnost korištenja dateUtils...');
  
  // Pronađi sve datoteke koje koriste datume
  const backendFiles = findFilesWithPattern(CONFIG.backendSrc, 'new Date');
  const frontendFiles = findFilesWithPattern(CONFIG.frontendSrc, 'new Date');
  
  console.log(`\n📊 Pronađeno ${backendFiles.length + frontendFiles.length} datoteka koje koriste Date objekte`);
  console.log(`  - Backend: ${backendFiles.length} datoteka`);
  console.log(`  - Frontend: ${frontendFiles.length} datoteka`);
  
  // Ispiši preporuke
  console.log('\n💡 Preporuke za standardizaciju:');
  console.log('  1. Koristi getCurrentDate() umjesto new Date() za dohvat trenutnog datuma');
  console.log('  2. Koristi formatDate() umjesto toLocaleString() ili toISOString() za formatiranje');
  console.log('  3. Koristi parseDate() umjesto new Date(string) za parsiranje datuma');
  console.log('  4. Koristi getCurrentYear() umjesto new Date().getFullYear()');
  
  console.log('\n💡 Pokreni skriptu s opcijom --fix za automatsko ispravljanje problema');
  console.log('💡 Pokreni skriptu s opcijom --dry-run za simulaciju ispravaka bez stvarnih promjena');
}

// Pomoćna funkcija za pronalaženje datoteka s određenim obrascem
function findFilesWithPattern(dir, pattern) {
  const results = [];
  
  function searchInDirectory(directory) {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Preskoči node_modules i slične direktorije
        if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
          searchInDirectory(itemPath);
        }
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        // Provjeri sadrži li datoteka traženi obrazac
        const content = fs.readFileSync(itemPath, 'utf8');
        if (content.includes(pattern)) {
          results.push(itemPath);
        }
      }
    }
  }
  
  searchInDirectory(dir);
  return results;
}

// Glavna funkcija
function main() {
  console.log('🚀 Pokrenuta skripta za specifične ispravke u standardizaciji datuma\n');
  
  if (CONFIG.shouldFix || CONFIG.dryRun) {
    applySpecificFixes();
  } else {
    checkDateUtilsConsistency();
  }
  
  console.log('\n✨ Završeno!');
}

// Pokreni skriptu
main();
