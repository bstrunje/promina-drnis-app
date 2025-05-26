/**
 * date-standardization-common-v2.js
 * 
 * Poboljšana zajednička skripta za standardizaciju korištenja datuma u Promina-Drnis aplikaciji.
 * Sadrži zajedničke funkcije i konstante koje koriste frontend i backend skripte.
 * 
 * Glavna poboljšanja:
 * - Ispravljeni nazivi modula (dateUtils umjesto date-utils)
 * - Zaštita od rekurzivnih poziva (posebno u getCurrentDate)
 * - Sigurnosne kopije datoteka prije izmjena
 * - Bolja detekcija konteksta varijabli u zamjenama
 */

const fs = require('fs');
const path = require('path');

// Konfiguracija putanja i opcija
const CONFIG = {
  // Putanje za frontend i backend
  rootDir: path.resolve(__dirname, '..'),
  backendSrc: path.resolve(__dirname, '../backend/src'),
  frontendSrc: path.resolve(__dirname, '../frontend/src'),
  
  // Opcije iz komandne linije
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  fix: process.argv.includes('--fix'),
  frontendOnly: process.argv.includes('--frontend'),
  backendOnly: process.argv.includes('--backend')
};

// Postavljanje naziva i putanja modula za date funkcije
const DATE_UTILS_MODULE_NAME = 'dateUtils'; // Točan naziv datoteke koji se koristi u projektu

// Pomoćne funkcije za rad s datotekama
const UTILS = {
  /**
   * Provjerava sadrži li sadržaj import funkcije iz dateUtils modula
   */
  hasDateUtilsImport: (content, funcName) => {
    const importRegex = new RegExp(`import\\s+{[^}]*\\b${funcName}\\b[^}]*}\\s+from\\s+['"].*${DATE_UTILS_MODULE_NAME}`, 'g');
    return importRegex.test(content);
  },

  /**
   * Dodaje import funkcije iz dateUtils modula ako već ne postoji
   */
  addDateUtilsImport: (content, funcName, isBackend = false) => {
    if (UTILS.hasDateUtilsImport(content, funcName)) {
      return content;
    }

    // Dodaj import na početak file-a, prilagođeno za backend ili frontend
    const importPath = isBackend ? '../utils/dateUtils.js' : '../utils/dateUtils';
    const importStatement = `import { ${funcName} } from '${importPath}';\n`;
    
    // Dodaj nakon postojećih importa ako postoje
    if (content.includes('import ')) {
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfImportIndex = content.indexOf(';', lastImportIndex) + 1;
      return content.slice(0, endOfImportIndex) + '\n' + importStatement + content.slice(endOfImportIndex);
    }
    
    // Inače dodaj na početak
    return importStatement + content;
  },

  /**
   * Stvara sigurnosnu kopiju datoteke prije izmjene
   */
  createBackup: (filePath) => {
    const backupDir = path.join(path.dirname(filePath), '.date-standardization-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const backupPath = path.join(backupDir, `${fileName}.${timestamp}.bak`);
    
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  },
  
  /**
   * Provjera sadrži li datoteka rekurzivne pozive funkcije
   */
  checkForRecursion: (content, funcName) => {
    // Pronađi definiciju funkcije
    const funcDefRegex = new RegExp(`(export)?\\s*function\\s+${funcName}\\s*\\([^)]*\\)\\s*{`, 'g');
    const match = funcDefRegex.exec(content);
    
    if (!match) return false;
    
    const funcStart = match.index;
    // Traži kraj funkcije - ovo je pojednostavljeno i može biti neprecizno za složenije funkcije
    let braceCount = 1;
    let funcEnd = funcStart + match[0].length;
    
    while (braceCount > 0 && funcEnd < content.length) {
      if (content[funcEnd] === '{') braceCount++;
      if (content[funcEnd] === '}') braceCount--;
      funcEnd++;
    }
    
    // Izvuci sadržaj funkcije
    const funcBody = content.substring(funcStart, funcEnd);
    
    // Provjeri sadrži li rekurzivni poziv
    const recursiveCallRegex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
    return recursiveCallRegex.test(funcBody);
  }
};

// Zajedničke transformacije za obje strane (frontend i backend)
const COMMON_PATTERNS = {
  // Zamjena import dateUtils s .js ekstenzijom za ESM module (frontend i backend)
  esmImportStatement: {
    pattern: /import\s+{([^}]+)}\s+from\s+['"]([^'"]*utils\/dateUtils)['"];?/g,
    replacement: (match, imports, path) => `import { ${imports} } from '${path}.js';`,
    description: 'Dodavanje .js ekstenzije u import statements za ESM kompatibilnost'
  },
  
  // Problem s nedostajućom .js ekstenzijom u importima
  fixImportPaths: {
    pattern: /import\s+{([^}]+)}\s+from\s+['"]([^'"]*utils\/dateUtils)['"];/g,
    replacement: (match, imports, path) => {
      // Ispravke importa da koriste .js ekstenziju za ESM i ispravnu putanju
      return `import { ${imports} } from '${path}.js';`;
    },
    description: 'Ispravke importa za ESM kompatibilnost'
  },
  
  // Problem s korištenjem dateUtils.js bez .js ekstenzije
  fixImportExtensions: {
    pattern: /from\s+['"]([^'"]*\/utils\/dateUtils)['"];/g,
    replacement: (match, path) => `from '${path}.js';`,
    description: 'Dodavanje .js ekstenzije u import statements za dateUtils'
  },
  
  // Problem s direktnim korištenjem new Date() - ali sprečavamo rekurziju
  newDate: {
    // Zamijeniti new Date() s getCurrentDate(), ali SAMO ako nismo u getCurrentDate funkciji
    pattern: /(?<!export\s+function\s+getCurrentDate[\s\S]*?)new\s+Date\(\)/g,
    replacement: 'getCurrentDate()',
    description: 'Zamjena new Date() s getCurrentDate() (ali ne unutar same getCurrentDate funkcije)'
  },
  
  // Problem s direktnim korištenjem .toISOString()
  toISOString: {
    pattern: /(\w+)\.toISOString\(\)/g,
    replacement: (match, varName) => {
      return `formatDate(${varName}, 'yyyy-MM-dd\\'T\\'HH:mm:ss.SSS\\'Z\\'')`;
    },
    description: 'Zamjena .toISOString() s formatDate()'
  },
  
  // Problem s korištenjem placeholdera poput $1 umjesto stvarne varijable
  placeholderDollarOne: {
    // Prepoznaj kontekst - ako je riječ o validatorima ili specifičnim funkcijama, koristimo odgovarajuće varijable
    pattern: /parseDate\(\$1\)/g,
    replacement: function(match, offset, string) {
      // Provjeri kontekst za varijable
      const prevLines = string.substring(0, offset).split('\\n').slice(-20).join('\\n');
      
      // Ako možemo odrediti bolje ime varijable iz konteksta
      if (prevLines.includes('start_date') && prevLines.includes('end_date')) {
        if (string.substring(offset-40, offset).includes('start')) {
          return 'parseDate(start_date)';
        } else if (string.substring(offset-40, offset).includes('end')) {
          return 'parseDate(end_date)';
        }
      } else if (prevLines.includes('lastBackup')) {
        return 'parseDate(config.lastBackup)';
      }
      
      // Generički zamjena, bolje nego $1
      return 'parseDate(date)';
    },
    description: 'Zamjena $1 s kontekstualno primjerenom varijablom za parseDate'
  }
};

/**
 * Funkcija za pronalaženje svih datoteka u direktoriju koje odgovaraju uzorku
 */
function findFilesWithPattern(rootDir, pattern) {
  const results = [];
  
  function traverseDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Preskočimo node_modules i build direktorije
        if (entry.name !== 'node_modules' && entry.name !== 'build' && entry.name !== 'dist' && !entry.name.startsWith('.')) {
          traverseDir(fullPath);
        }
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }
  
  traverseDir(rootDir);
  return results;
}

/**
 * Funkcija za provjeru je li datoteka iz backenda
 */
function isBackendFile(path) {
  const result = path.includes('/backend/') || path.includes('\\backend\\');
  if (CONFIG.verbose) {
    console.debug(`isBackendFile za ${path}: ${result}`);
  }
  return result;
}

/**
 * Funkcija za provjeru je li datoteka iz frontenda
 */
function isFrontendFile(path) {
  const result = path.includes('/frontend/') || path.includes('\\frontend\\');
  if (CONFIG.verbose) {
    console.debug(`isFrontendFile za ${path}: ${result}`);
  }
  return result;
}

/**
 * Funkcija za primjenu transformacije na sadržaj datoteke
 */
function applyTransformation(content, pattern, replacement, description, filePath) {
  let modified = false;
  let newContent = content;
  
  // Primijeni transformaciju ovisno o tipu replacementa
  if (typeof pattern === 'string') {
    if (content.includes(pattern)) {
      newContent = content.replace(new RegExp(pattern, 'g'), replacement);
      modified = true;
    }
  } else if (pattern instanceof RegExp) {
    if (pattern.test(content)) {
      // Resetiraj lastIndex ako je regex globalan
      if (pattern.global) pattern.lastIndex = 0;
      
      // Ako je replacement funkcija, onda provjeravamo svaki match posebno
      if (typeof replacement === 'function') {
        let lastIndex = 0;
        let result = '';
        let match;
        
        // Resetiraj regex za ponovno pretraživanje
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(content)) !== null) {
          // Dodaj tekst do matchanog dijela
          result += content.substring(lastIndex, match.index);
          
          // Primijeni replacement funkciju
          try {
            const replaced = replacement(match[0], match.index, content, ...(match.slice(1)));
            result += replaced;
            modified = true;
          } catch (error) {
            console.error(`Greška pri primjeni ${description} na ${filePath}:`, error);
            // U slučaju greške, zadrži originalni tekst
            result += match[0];
          }
          
          lastIndex = pattern.lastIndex;
        }
        
        // Dodaj ostatak teksta
        result += content.substring(lastIndex);
        newContent = result;
      } else {
        // Ako je replacement string, jednostavno primijeni replace
        newContent = content.replace(pattern, replacement);
        modified = true;
      }
    }
  }
  
  return { content: newContent, modified };
}

/**
 * Funkcija za primjenu više transformacija na sadržaj datoteke
 */
function applyTransformations(content, patterns, filePath) {
  let modified = false;
  let newContent = content;
  
  for (const [name, config] of Object.entries(patterns)) {
    const result = applyTransformation(
      newContent, 
      config.pattern, 
      config.replacement, 
      config.description, 
      filePath
    );
    
    if (result.modified) {
      console.log(`  ✅ Primijenjena transformacija: ${config.description} (${name})`);
      modified = true;
      newContent = result.content;
    }
  }
  
  return { content: newContent, modified };
}

/**
 * Funkcija za provjeru konzistentnosti importa dateUtils funkcija
 */
function checkDateUtilsConsistency(dir, { frontendOnly = false, backendOnly = false } = {}) {
  console.log(`Provjera dateUtils konzistentnosti za direktorij: ${dir}`);
  console.log(`Parametri: frontendOnly=${frontendOnly}, backendOnly=${backendOnly}`);

  // Pronađi sve backend i frontend datoteke ovisno o parametrima
  let filesToCheck = [];
  
  if (backendOnly) {
    // Samo backend datoteke
    filesToCheck = findFilesWithPattern(CONFIG.backendSrc, /\.(ts|js)$/i);
    console.log(`ℹ️ Provjera samo backend datoteka (${filesToCheck.length} datoteka)`);
  } else if (frontendOnly) {
    // Samo frontend datoteke
    filesToCheck = findFilesWithPattern(CONFIG.frontendSrc, /\.(ts|tsx|js|jsx)$/i);
    console.log(`ℹ️ Provjera samo frontend datoteka (${filesToCheck.length} datoteka)`);
  } else {
    // Sve datoteke
    filesToCheck = [
      ...findFilesWithPattern(CONFIG.backendSrc, /\.(ts|js)$/i),
      ...findFilesWithPattern(CONFIG.frontendSrc, /\.(ts|tsx|js|jsx)$/i)
    ];
    console.log(`ℹ️ Provjera svih datoteka (${filesToCheck.length} datoteka)`);
  }
  
  // Datoteke koje zaobilazimo u provjeri
  const skipFiles = [
    'dateUtils.ts',
    'dateUtils.js',
    'date-utils.ts',
    'date-utils.js'
  ];
  
  // Filtriraj prema potrebi za frontend/backend
  if (frontendOnly) {
    filesToCheck = filesToCheck.filter(file => isFrontendFile(file));
  } else if (backendOnly) {
    filesToCheck = filesToCheck.filter(file => isBackendFile(file));
  }
  
  // Filtriraj datoteke koje preskačemo
  filesToCheck = filesToCheck.filter(file => !skipFiles.some(skip => file.endsWith(skip)));
  
  console.log(`📊 Ukupno datoteka za provjeru: ${filesToCheck.length}`);
  
  // Statistika
  const stats = {
    checkedFiles: 0,
    modifiedFiles: 0,
    errors: 0
  };
  
  // Provjeri svaku datoteku
  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      stats.checkedFiles++;
      
      // Primijeni transformacije
      const { content: newContent, modified } = applyTransformations(content, COMMON_PATTERNS, file);
      
      if (modified) {
        console.log(`🔄 Pronađene potrebne promjene u ${file}`);
        stats.modifiedFiles++;
        
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
      stats.errors++;
    }
  }
  
  // Ispiši statistiku
  console.log('\n📈 Statistika:');
  console.log(`  - Provjereno datoteka: ${stats.checkedFiles}`);
  console.log(`  - Modificirano datoteka: ${stats.modifiedFiles}`);
  console.log(`  - Greške: ${stats.errors}`);
  
  if (CONFIG.dryRun) {
    console.log('\n⚠️ NAPOMENA: Ovo je bio dry-run. Koristi --fix za spremanje promjena.');
  }
  
  return stats;
}

// Izvezi potrebne funkcije i konstante
module.exports = {
  CONFIG,
  UTILS,
  COMMON_PATTERNS,
  findFilesWithPattern,
  isBackendFile,
  isFrontendFile,
  applyTransformation,
  applyTransformations,
  checkDateUtilsConsistency
};
