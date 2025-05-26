/**
 * date-standardization-backend-v2.js
 * 
 * Poboljšana skripta za standardizaciju korištenja datuma u backend dijelu Promina-Drnis aplikacije.
 * Fokusira se na TypeScript/Node.js specifične probleme i ESM kompatibilnost.
 * 
 * Glavna poboljšanja:
 * - Ispravljen naziv datoteke (dateUtils umjesto date-utils)
 * - Bolja detekcija konteksta za $1 placeholdere
 * - Provjera postojanja varijabli prije zamjene
 * - Zaštita od rekurzivnih poziva
 * 
 * Pokretanje: node date-standardization-backend-v2.js [--fix] [--dry-run] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { CONFIG, UTILS, COMMON_PATTERNS, findFilesWithPattern, applyTransformations } = require('./date-standardization-common-v2.js');

// Backend specifični obrasci za pretraživanje
const BACKEND_PATTERNS = {
  // Funkcije za ispravak import statement ekstenzija (.js)
  esmImportStatement: {
    pattern: /import\s+{([^}]+)}\s+from\s+['"]([^'"]*utils\/dateUtils)['"];?/g,
    replacement: (match, imports, path) => `import { ${imports} } from '${path}.js';`,
    description: 'Dodavanje .js ekstenzije u import statements za ESM kompatibilnost'
  },
  
  // Problem s direktnim korištenjem instanceof Date
  instanceofDate: {
    pattern: /(\w+)\s+instanceof\s+Date/g,
    replacement: (match, variable) => `${variable} instanceof Date`,
    description: 'Provjera ispravnosti instanceof Date operatora'
  },

  // Problematični Date.now() pozivi umjesto getCurrentDate()
  dateNow: {
    pattern: /Date\.now\(\)/g,
    replacement: 'getCurrentDate().getTime()',
    description: 'Zamjena Date.now() s getCurrentDate().getTime()'
  },
  
  // Problem s Token expiry kalkulacijama
  tokenExpiry: {
    pattern: /new\s+Date\(Date\.now\(\)\s*\+\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)\)/g,
    replacement: (match, a, b, c, d) => {
      return `new Date(getCurrentDate().getTime() + ${a} * ${b} * ${c} * ${d})`;
    },
    description: 'Standardizacija izračuna isteka tokena'
  },
  
  // Problem s undefined varijablama u parseDate pozivima
  fixUndefinedInput: {
    pattern: /parseDate\(input\.(start|end)_date\)/g,
    replacement: (match, dateType) => {
      return `parseDate(activityData.${dateType}_date)`;
    },
    description: 'Zamjena undefined varijable input s activityData'
  },
  
  // Problem s korištenjem date u systemAdmin.service.ts
  fixSystemAdminDate: {
    pattern: /parseDate\(\$1\)/g,
    replacement: function(match, offset, string) {
      // Provjeri kontekst datoteke
      if (string.includes('systemAdmin.service') || string.includes('SystemAdminService')) {
        if (string.substring(offset-100, offset).includes('startOfWeek')) {
          return 'parseDate(now)';
        } else if (string.substring(offset-100, offset).includes('weekEnd')) {
          return 'parseDate(endDate)';
        }
      }
      
      // Generički slučaj
      return 'parseDate(date)';
    },
    description: 'Zamjena $1 s odgovarajućom varijablom u systemAdmin.service.ts'
  },
  
  // Problem s korištenjem $1 u systemHealth.service.ts
  fixSystemHealthDate: {
    pattern: /lastBackup: parseDate\(\$1\),/g,
    replacement: 'lastBackup: parseDate(config.lastBackup),',
    description: 'Zamjena $1 s config.lastBackup u systemHealth.service.ts'
  },
  
  // Problem s neispravnim tipovima u activity.service.ts
  fixActivityServiceTypes: {
    pattern: /(const startDate = parseDate\(.*?start_date\);)\s*(const endDate = parseDate\(.*?end_date\);)/g,
    replacement: `// Konverzija ulaznih datuma u Date objekte
            // parseDate očekuje string, a ne Date objekt
            const startDate = typeof activityData.start_date === 'string' 
                ? parseDate(activityData.start_date)
                : new Date(activityData.start_date);
                
            const endDate = typeof activityData.end_date === 'string'
                ? parseDate(activityData.end_date)
                : new Date(activityData.end_date);`,
    description: 'Ispravak tipova za parseDate u activity.service.ts'
  }
};

/**
 * Funkcija za ispravak problema s $1 placeholderima u parseDate i formatDate funkcijama
 */
function fixDatePlaceholders() {
  console.log('\n🔧 Sistemski ispravak problema s $1 placeholderima i formatiranjem datuma...');
  
  // Pronađi sve TS datoteke u backend/src direktoriju
  const tsFiles = findFilesWithPattern(CONFIG.backendSrc, /\.(ts|js)$/i);
  console.log(`Pronađeno ${tsFiles.length} datoteka za provjeru.`);
  
  let modifiedFiles = 0;
  
  // Posebno obradi ključne datoteke
  const criticalFiles = {
    'activity.service.ts': { pattern: BACKEND_PATTERNS.fixActivityServiceTypes },
    'systemAdmin.service.ts': { pattern: BACKEND_PATTERNS.fixSystemAdminDate },
    'systemHealth.service.ts': { pattern: BACKEND_PATTERNS.fixSystemHealthDate }
  };
  
  // Obradi svaku datoteku
  for (const file of tsFiles) {
    try {
      const fileName = path.basename(file);
      const content = fs.readFileSync(file, 'utf8');
      
      // Odaberi specifične transformacije za ovu datoteku
      let transformations = { ...COMMON_PATTERNS };
      
      // Dodaj specifične transformacije za ključne datoteke
      if (criticalFiles[fileName]) {
        transformations = { ...transformations, ...criticalFiles[fileName] };
      }
      
      // Dodaj općenite backend transformacije
      transformations = { ...transformations, ...BACKEND_PATTERNS };
      
      // Primijeni transformacije
      const { content: newContent, modified } = applyTransformations(content, transformations, file);
      
      if (modified) {
        console.log(`🔄 Pronađene potrebne promjene u ${file}`);
        modifiedFiles++;
        
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
  
  console.log(`✅ Modificirano ${modifiedFiles} datoteka.`);
}

/**
 * Funkcija za ispravak problema s import statements u backend fajlovima
 */
function fixBackendImports() {
  console.log('\n🔧 Ispravak problema s import statements u backend fajlovima...');
  
  // Pronađi sve TS datoteke u backend/src direktoriju
  const tsFiles = findFilesWithPattern(CONFIG.backendSrc, /\.(ts|js)$/i);
  console.log(`Pronađeno ${tsFiles.length} datoteka za provjeru.`);
  
  let modifiedFiles = 0;
  
  // Obradi svaku datoteku
  for (const file of tsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Provjeri ima li datoteka import iz dateUtils bez .js ekstenzije
      if (/from\s+['"].*dateUtils['"]\s*;/.test(content) || /from\s+['"].*date-utils['"]\s*;/.test(content)) {
        console.log(`🔍 Datoteka ${file} ima import iz dateUtils bez .js ekstenzije.`);
        
        // Primijeni samo transformacije za import
        const { content: newContent, modified } = applyTransformations(
          content, 
          {
            esmImportStatement: BACKEND_PATTERNS.esmImportStatement,
            fixImportExtensions: COMMON_PATTERNS.fixImportExtensions
          }, 
          file
        );
        
        if (modified) {
          console.log(`🔄 Ispravljen import u ${file}`);
          modifiedFiles++;
          
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
      }
      
      // Provjeri ima li datoteka duplicirane importe iz dateUtils
      const importMatches = content.match(/import\s+{[^}]*}\s+from\s+['"].*dateUtils['"]\s*;/g);
      if (importMatches && importMatches.length > 1) {
        console.log(`⚠️ Datoteka ${file} ima duplicirane importe iz dateUtils.`);
        
        // Ovo je složenije za ispraviti, pa samo prijavi problem
        console.log(`  ⚠️ Potrebno ručno ispraviti duplicirane importe u ${file}.`);
      }
    } catch (error) {
      console.error(`❌ Greška pri obradi ${file}:`, error);
    }
  }
  
  console.log(`✅ Modificirano ${modifiedFiles} datoteka.`);
}

/**
 * Funkcija za specifične ispravke u kontrolerima i repozitorijima
 */
function applySpecificBackendFixes() {
  console.log('\n🔧 Primjena specifičnih ispravaka u kontrolerima i repozitorijima...');
  
  // Specifične datoteke koje trebaju ispravke
  const specificFiles = [
    { 
      path: path.join(CONFIG.backendSrc, 'services', 'activity.service.ts'),
      description: 'Ispravak tipova u activity.service.ts'
    },
    {
      path: path.join(CONFIG.backendSrc, 'services', 'systemAdmin.service.ts'),
      description: 'Ispravak date varijable u systemAdmin.service.ts'
    },
    {
      path: path.join(CONFIG.backendSrc, 'services', 'systemHealth.service.ts'),
      description: 'Ispravak config.lastBackup u systemHealth.service.ts'
    },
    {
      path: path.join(CONFIG.backendSrc, 'repositories', 'membership.repository.ts'),
      description: 'Ispravak date varijable u membership.repository.ts'
    },
    {
      path: path.join(CONFIG.backendSrc, 'middleware', 'validators.ts'),
      description: 'Ispravak $1 placeholdera u validators.ts'
    }
  ];
  
  // Posebni obrasci za ispravak po datoteci
  const specificPatterns = {
    'activity.service.ts': {
      fixActivityServiceTypes: BACKEND_PATTERNS.fixActivityServiceTypes,
      fixUndefinedInput: BACKEND_PATTERNS.fixUndefinedInput
    },
    'systemAdmin.service.ts': {
      fixSystemAdminDate: BACKEND_PATTERNS.fixSystemAdminDate
    },
    'systemHealth.service.ts': {
      fixSystemHealthDate: BACKEND_PATTERNS.fixSystemHealthDate
    },
    'membership.repository.ts': {
      pattern: /\[parseDate\(\$1\),\s*year\]/g,
      replacement: '[getCurrentDate(), year]',
      description: 'Zamjena parseDate($1) s getCurrentDate() u membership.repository.ts'
    },
    'validators.ts': {
      pattern: /const\s+startDateTime\s*=\s*parseDate\(\$1\);\s*const\s+endDateTime\s*=\s*parseDate\(\$1\);/g,
      replacement: 'const startDateTime = parseDate(start_date);\nconst endDateTime = parseDate(end_date);',
      description: 'Ispravak $1 placeholdera u validators.ts'
    }
  };
  
  // Obradi svaku specifičnu datoteku
  for (const fileInfo of specificFiles) {
    if (fs.existsSync(fileInfo.path)) {
      console.log(`🔍 Provjera ${path.basename(fileInfo.path)}...`);
      
      try {
        const content = fs.readFileSync(fileInfo.path, 'utf8');
        const fileName = path.basename(fileInfo.path);
        
        // Pronađi specifične obrasce za ovu datoteku
        const specificPattern = specificPatterns[fileName];
        
        if (specificPattern) {
          // Primijeni transformacije
          const { content: newContent, modified } = applyTransformations(
            content, 
            typeof specificPattern === 'object' ? specificPattern : { fix: specificPattern },
            fileInfo.path
          );
          
          if (modified) {
            console.log(`🔄 Ispravljen problem u ${fileInfo.path}`);
            
            // Ako je fix mode, spremi promjene
            if (CONFIG.fix && !CONFIG.dryRun) {
              // Napravi backup prvo
              const backupPath = UTILS.createBackup(fileInfo.path);
              console.log(`  📦 Napravljena sigurnosna kopija: ${backupPath}`);
              
              // Spremi promjene
              fs.writeFileSync(fileInfo.path, newContent, 'utf8');
              console.log(`  💾 Spremljene promjene u ${fileInfo.path}`);
            } else if (CONFIG.dryRun) {
              console.log(`  🔍 [DRY RUN] Promjene NISU spremljene. Koristi --fix za spremanje.`);
            }
          } else {
            console.log(`✅ Nema problema u ${fileInfo.path}.`);
          }
        }
      } catch (error) {
        console.error(`❌ Greška pri obradi ${fileInfo.path}:`, error);
      }
    } else {
      console.warn(`⚠️ Datoteka ${fileInfo.path} ne postoji!`);
    }
  }
}

/**
 * Funkcija za ispravak problema s token expiry računima
 */
function fixTokenExpiryCalculations() {
  console.log('\n🔧 Ispravak problema s token expiry računima...');
  
  // Pronađi sve TS datoteke koje sadrže token expiry račune
  const allTsFiles = findFilesWithPattern(CONFIG.backendSrc, /\.(ts|js)$/i);
  console.log(`Provjera ${allTsFiles.length} datoteka za token expiry račune...`);
  
  let tokenExpiryFiles = [];
  
  // Provjeri koje datoteke sadrže token expiry račune
  for (const file of allTsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Provjeri sadrži li datoteka token expiry račune
      if (/new\s+Date\(Date\.now\(\)\s*\+\s*\d+\s*\*\s*\d+\s*\*\s*\d+\s*\*\s*\d+\)/.test(content)) {
        tokenExpiryFiles.push(file);
      }
    } catch (error) {
      console.error(`❌ Greška pri provjeri ${file}:`, error);
    }
  }
  
  console.log(`Pronađeno ${tokenExpiryFiles.length} datoteka s token expiry računima.`);
  
  // Ispravi svaku datoteku
  for (const file of tokenExpiryFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Primijeni transformacije za token expiry
      const { content: newContent, modified } = applyTransformations(
        content, 
        { tokenExpiry: BACKEND_PATTERNS.tokenExpiry },
        file
      );
      
      if (modified) {
        console.log(`🔄 Ispravljen token expiry račun u ${file}`);
        
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
 * Glavna funkcija za backend standardizaciju
 */
function main() {
  console.log('🚀 Pokretanje backend standardizacije datuma...');
  console.log(`📂 Backend direktorij: ${CONFIG.backendSrc}`);
  console.log(`🔧 Opcije: ${CONFIG.dryRun ? 'dry-run' : ''} ${CONFIG.fix ? 'fix' : ''} ${CONFIG.verbose ? 'verbose' : ''}`);
  
  // Prvo ispravi import statements
  fixBackendImports();
  
  // Zatim ispravi probleme s $1 placeholderima
  fixDatePlaceholders();
  
  // Primijeni specifične ispravke za određene datoteke
  applySpecificBackendFixes();
  
  // Ispravi token expiry račune
  fixTokenExpiryCalculations();
  
  // Na kraju provjeri konzistentnost importa i korištenja
  console.log('\n🔍 Provjera konzistentnosti korištenja dateUtils funkcija...');
  const stats = require('./date-standardization-common-v2').checkDateUtilsConsistency(CONFIG.backendSrc, { backendOnly: true });
  
  // Završi s porukom
  console.log('\n✅ Backend standardizacija datuma završena!');
  
  return stats;
}

// Pokreni skriptu ako je direktno pokrenuta
if (require.main === module) {
  main();
}

// Izvezi funkcije za korištenje u drugim skriptama
module.exports = {
  fixDatePlaceholders,
  fixBackendImports,
  applySpecificBackendFixes,
  fixTokenExpiryCalculations,
  main
};
