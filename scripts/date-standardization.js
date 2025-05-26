/**
 * Skripta za standardizaciju korištenja datuma u Promina-Drnis aplikaciji
 * 
 * Ova skripta analizira kod i identificira mjesta gdje se datumi ne koriste prema standardima
 * definiranim u docs/date-time-standardization.md
 * 
 * Pokretanje: node date-standardization.js [--fix]
 * Opcija --fix će automatski ispraviti probleme gdje je to moguće
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Konfiguracijske postavke
const CONFIG = {
  rootDir: path.resolve(__dirname, '..'),
  backendSrc: path.resolve(__dirname, '../backend/src'),
  frontendSrc: path.resolve(__dirname, '../frontend/src'),
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  excludeDirs: ['node_modules', 'dist', 'build', '.git'],
  shouldFix: process.argv.includes('--fix'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Obrasci koje tražimo
const PATTERNS = {
  // Računanje datuma isteka tokena sa getTime()
  tokenExpiryCalculation: {
    pattern: /new Date\(getCurrentDate\(\)\.getTime\(\) \+ (\d+) \* (\d+) \* (\d+) \* (\d+)\)/g,
    description: 'Računanje datuma isteka tokena ručno umjesto korištenja getTokenExpiryDate()',
    importStatement: "import { getTokenExpiryDate } from '../utils/dateUtils';",
    importStatementRelative: (relativePath) => `import { getTokenExpiryDate } from '${relativePath}utils/dateUtils';`,
    shouldFix: (line, filePath) => {
      // Ne mijenjaj u dateUtils.ts
      if (filePath.includes('dateUtils.ts')) return false;
      // Ne mijenjaj ako je dio komentara
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
      return true;
    },
    customReplacement: (match, line) => {
      // Izračunaj broj dana iz izraza
      const regex = /new Date\(getCurrentDate\(\)\.getTime\(\) \+ (\d+) \* (\d+) \* (\d+) \* (\d+)\)/;
      const matches = regex.exec(match);
      
      if (matches && matches.length === 5) {
        const milliseconds = parseInt(matches[1]);
        const seconds = parseInt(matches[2]);
        const minutes = parseInt(matches[3]);
        const hours = parseInt(matches[4]);
        const days = (milliseconds * seconds * minutes * hours) / (24 * 60 * 60 * 1000);
        
        return `getTokenExpiryDate(${days})`;
      }
      
      return match; // Vrati nepromijenjeno ako ne može parsirati
    }
  },
  // Direktno korištenje new Date() umjesto getCurrentDate()
  directDateCreation: {
    pattern: /new Date\(\)/g,
    replacement: 'getCurrentDate()',
    importStatement: "import { getCurrentDate } from '../utils/dateUtils';",
    importStatementRelative: (relativePath) => `import { getCurrentDate } from '${relativePath}utils/dateUtils';`,
    description: 'Direktno korištenje new Date() umjesto getCurrentDate()',
    shouldFix: (line, filePath) => {
      // Ne mijenjaj u dateUtils.ts
      if (filePath.includes('dateUtils.ts')) return false;
      // Ne mijenjaj ako je dio komentara
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
      return true;
    }
  },
  // Korištenje toLocaleString bez dateUtils
  toLocaleString: {
    pattern: /\.toLocaleString\(['"]hr-HR['"]\)/g,
    replacement: '', // Zamijeniti s formatDate pozivom
    description: 'Korištenje toLocaleString umjesto formatDate',
    shouldFix: (line, filePath) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
      return true;
    },
    customReplacement: (match, line) => {
      // Pokušaj izvući datum koji se formatira
      const dateExpr = line.substring(0, line.indexOf(match)).trim();
      if (dateExpr) {
        return `formatDate(${dateExpr}, 'dd.MM.yyyy')`;
      }
      return match;
    }
  },
  // Korištenje toISOString bez dateUtils
  toISOString: {
    pattern: /\.toISOString\(\)/g,
    replacement: '', // Zamijeniti s formatDate pozivom
    description: 'Korištenje toISOString umjesto formatDate',
    shouldFix: (line, filePath) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
      // Ne mijenjaj u debug.routes.ts jer se tamo koristi za generiranje imena datoteka
      if (filePath.includes('debug.routes.ts')) return false;
      return true;
    },
    customReplacement: (match, line) => {
      // Pokušaj izvući datum koji se formatira
      const dateExpr = line.substring(0, line.indexOf(match)).trim();
      if (dateExpr) {
        return `formatDate(${dateExpr}, 'yyyy-MM-dd\\'T\\'HH:mm:ss.SSS\\'Z\\'')`;
      }
      return match;
    }
  },
  // Direktno parsiranje datuma bez dateUtils
  directDateParsing: {
    pattern: /new Date\(([^)]+)\)/g,
    replacement: 'parseDate($1)',
    importStatement: "import { parseDate } from '../utils/dateUtils';",
    importStatementRelative: (relativePath) => `import { parseDate } from '${relativePath}utils/dateUtils';`,
    description: 'Direktno parsiranje datuma bez parseDate',
    shouldFix: (line, filePath) => {
      // Ne mijenjaj u dateUtils.ts
      if (filePath.includes('dateUtils.ts')) return false;
      // Ne mijenjaj ako je dio komentara
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
      // Ne mijenjaj ako je konstruktor bez parametara
      if (line.includes('new Date()')) return false;
      return true;
    }
  }
};

// Funkcija za pronalaženje svih datoteka u direktoriju
function findFiles(dir, extensions, excludeDirs = []) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        results = results.concat(findFiles(filePath, extensions, excludeDirs));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

// Funkcija za analizu datoteke
function analyzeFile(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Provjeri ima li već importane funkcije iz dateUtils
  const hasImport = {
    getCurrentDate: content.includes('import') && 
                    (content.includes('getCurrentDate') && content.includes('dateUtils')),
    formatDate: content.includes('import') && 
                (content.includes('formatDate') && content.includes('dateUtils')),
    parseDate: content.includes('import') && 
               (content.includes('parseDate') && content.includes('dateUtils'))
  };
  
  // Analiziraj svaku liniju
  lines.forEach((line, index) => {
    for (const [key, pattern] of Object.entries(PATTERNS)) {
      const matches = [...line.matchAll(pattern.pattern)];
      
      if (matches.length > 0 && pattern.shouldFix(line, filePath)) {
        issues.push({
          filePath,
          lineNumber: index + 1,
          line,
          pattern: key,
          matches,
          needsImport: !hasImport[key.replace('direct', '').replace('Creation', '').toLowerCase()]
        });
      }
    }
  });
  
  return issues;
}

// Funkcija za ispravak datoteke
function fixFile(filePath, issues) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  
  // Sortiraj probleme po liniji (od najveće prema najmanjoj) da ne poremetimo indekse
  issues.sort((a, b) => b.lineNumber - a.lineNumber);
  
  // Prvo dodaj potrebne importe
  const neededImports = new Set();
  issues.forEach(issue => {
    const pattern = PATTERNS[issue.pattern];
    if (issue.needsImport && pattern.importStatement) {
      neededImports.add(pattern.importStatement);
    }
  });
  
  // Dodaj importe na početak datoteke (nakon postojećih importa)
  if (neededImports.size > 0) {
    // Pronađi zadnji import
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      } else if (lastImportIndex !== -1 && !lines[i].trim().startsWith('import ')) {
        break;
      }
    }
    
    // Ako nema importa, dodaj na početak
    if (lastImportIndex === -1) {
      lines.unshift(...Array.from(neededImports));
    } else {
      // Inače, dodaj nakon zadnjeg importa
      lines.splice(lastImportIndex + 1, 0, ...Array.from(neededImports));
      // Ažuriraj indekse linija za probleme
      issues.forEach(issue => {
        if (issue.lineNumber > lastImportIndex) {
          issue.lineNumber += neededImports.size;
        }
      });
    }
  }
  
  // Zatim ispravi svaki problem
  issues.forEach(issue => {
    const pattern = PATTERNS[issue.pattern];
    let line = lines[issue.lineNumber - 1];
    
    if (pattern.customReplacement) {
      // Koristi prilagođenu zamjenu
      issue.matches.forEach(match => {
        const replacement = pattern.customReplacement(match[0], line);
        line = line.replace(match[0], replacement);
      });
    } else {
      // Koristi standardnu zamjenu
      issue.matches.forEach(match => {
        line = line.replace(match[0], pattern.replacement);
      });
    }
    
    lines[issue.lineNumber - 1] = line;
  });
  
  // Spremi promjene
  if (CONFIG.shouldFix && !CONFIG.dryRun) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ Ispravljeno: ${filePath}`);
  } else if (CONFIG.dryRun) {
    console.log(`🔍 Bi bilo ispravljeno (dry run): ${filePath}`);
  }
  
  return lines.join('\n');
}

// Glavna funkcija
function main() {
  console.log('🔍 Analiziram kod za standardizaciju datuma...');
  
  // Pronađi sve datoteke
  const backendFiles = findFiles(CONFIG.backendSrc, CONFIG.fileExtensions, CONFIG.excludeDirs);
  const frontendFiles = findFiles(CONFIG.frontendSrc, CONFIG.fileExtensions, CONFIG.excludeDirs);
  const allFiles = [...backendFiles, ...frontendFiles];
  
  console.log(`📁 Pronađeno ${allFiles.length} datoteka za analizu`);
  
  // Analiziraj svaku datoteku
  const allIssues = [];
  allFiles.forEach(filePath => {
    const issues = analyzeFile(filePath);
    if (issues.length > 0) {
      allIssues.push({ filePath, issues });
    }
  });
  
  // Ispiši rezultate
  console.log(`\n🔍 Pronađeno ${allIssues.reduce((sum, file) => sum + file.issues.length, 0)} problema u ${allIssues.length} datoteka`);
  
  // Grupiraj probleme po tipu
  const issuesByType = {};
  allIssues.forEach(file => {
    file.issues.forEach(issue => {
      if (!issuesByType[issue.pattern]) {
        issuesByType[issue.pattern] = [];
      }
      issuesByType[issue.pattern].push(issue);
    });
  });
  
  // Ispiši statistiku po tipu problema
  console.log('\n📊 Statistika problema:');
  for (const [type, issues] of Object.entries(issuesByType)) {
    console.log(`  - ${PATTERNS[type].description}: ${issues.length} problema`);
  }
  
  // Ispravi probleme ako je zatraženo
  if (CONFIG.shouldFix || CONFIG.dryRun) {
    console.log(`\n🔧 ${CONFIG.dryRun ? 'Simuliram' : 'Ispravljam'} probleme...`);
    allIssues.forEach(file => {
      fixFile(file.filePath, file.issues);
    });
  } else {
    // Ispiši detaljne informacije o problemima
    console.log('\n📋 Detalji problema:');
    allIssues.forEach(file => {
      console.log(`\n📁 ${file.filePath}`);
      file.issues.forEach(issue => {
        console.log(`  - Linija ${issue.lineNumber}: ${PATTERNS[issue.pattern].description}`);
        if (CONFIG.verbose) {
          console.log(`    ${issue.line.trim()}`);
        }
      });
    });
    
    console.log('\n💡 Pokreni skriptu s opcijom --fix za automatsko ispravljanje problema');
    console.log('💡 Pokreni skriptu s opcijom --dry-run za simulaciju ispravaka bez stvarnih promjena');
    console.log('💡 Pokreni skriptu s opcijom --verbose za detaljniji ispis');
  }
}

// Pokreni skriptu
main();
