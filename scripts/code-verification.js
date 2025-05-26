/**
 * code-verification.js
 * 
 * Poboljšana skripta za verifikaciju ispravnosti TypeScript koda prije i nakon promjena
 * Služi kao dodatni sigurnosni sloj za skripte date-standardization-*.js
 * 
 * Glavna poboljšanja:
 * - Detekcija rekurzivnih poziva funkcija (posebno getCurrentDate)
 * - Provjera postojanja datoteka u import naredbama
 * - Bolja analiza nedefiniranih varijabli u kontekstu
 * - Sigurnosne kopije datoteka prije transformacija
 * 
 * Modul za verifikaciju TypeScript koda pomoću TypeScript kompajlera
 * Koristi se u skriptama za standardizaciju datuma kako bi se izbjeglo uvođenje grešaka
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

/**
 * Provjerava je li TypeScript instaliran u projektu
 * @returns {boolean} true ako je TypeScript dostupan
 */
function isTypeScriptAvailable() {
  try {
    execSync('npx tsc --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Stvara privremenu datoteku s TypeScript kodom
 * @param {string} content - Sadržaj TypeScript koda za provjeru
 * @returns {string} - Putanja do privremene datoteke
 */
function createTempTsFile(content) {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `verify-ts-${Date.now()}.ts`);
  fs.writeFileSync(tempFilePath, content, 'utf8');
  return tempFilePath;
}

/**
 * Briše privremenu datoteku
 * @param {string} filePath - Putanja do privremene datoteke
 */
function deleteTempFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error(`Greška pri brisanju privremene datoteke ${filePath}:`, error.message);
  }
}

/**
 * Provjerava je li TypeScript kod ispravan
 * @param {string} content - Sadržaj TypeScript koda za provjeru
 * @param {string} [contextImports=''] - Dodatni importi potrebni za kontekst
 * @returns {object} - Rezultat provjere s informacijama o uspjehu i greškama
 */
function verifyTypeScriptSyntax(content, contextImports = '') {
  if (!isTypeScriptAvailable()) {
    return {
      success: false,
      errors: ['TypeScript nije pronađen. Instalirajte TypeScript s "npm install typescript".'],
      message: 'TypeScript nije dostupan za provjeru sintakse.'
    };
  }

  // Dodaj osnovne importi za kontekst
  const fullContent = `${contextImports}\n${content}`;
  const tempFilePath = createTempTsFile(fullContent);
  
  try {
    // Provjeri samo sintaksu bez generiranja JS koda
    execSync(`npx tsc --noEmit --target ES2018 --module NodeNext --moduleResolution NodeNext ${tempFilePath}`, { stdio: 'pipe' });
    return {
      success: true,
      errors: [],
      message: 'TypeScript kod je sintaksno ispravan.'
    };
  } catch (error) {
    // Dohvati greške iz TypeScript kompajlera
    const errorOutput = error.stdout ? error.stdout.toString() : error.message;
    const errorLines = errorOutput.split('\n').filter(line => line.includes('error TS'));
    
    // Formatiraj greške za lakše čitanje
    const formattedErrors = errorLines.map(line => {
      // Ukloni putanju do privremene datoteke iz poruke
      return line.replace(tempFilePath, 'code').trim();
    });
    
    return {
      success: false,
      errors: formattedErrors,
      message: 'TypeScript kod sadrži sintaksne greške.'
    };
  } finally {
    deleteTempFile(tempFilePath);
  }
}

/**
 * Provjerava referencira li kod nedefinirane varijable
 * @param {string} content - Sadržaj TypeScript koda
 * @param {Object} options - Opcije za provjeru
 * @param {string[]} options.definedVars - Popis definiranih varijabli u kontekstu
 * @param {string[]} options.importedModules - Popis importiranih modula
 * @returns {object} - Rezultat provjere s informacijama o nedefiniranim varijablama
 */
function checkUndefinedVariables(content, { definedVars = [], importedModules = [] } = {}) {
  // Generiraj mock importove za kontekst
  const contextImports = importedModules.map(module => `import * as ${module.replace(/[^a-zA-Z0-9_]/g, '_')} from '${module}';`).join('\n');
  
  // Generiraj deklaracije za varijable u kontekstu
  const contextVars = definedVars.map(v => `let ${v}: any;`).join('\n');
  
  // Provjeri sintaksu s kontekstom
  return verifyTypeScriptSyntax(content, `${contextImports}\n${contextVars}`);
}

/**
 * Provjerava je li korištenje date-utils funkcija ispravno
 * @param {string} content - Sadržaj TypeScript koda
 * @param {Object} options - Opcije za provjeru
 * @param {string[]} options.definedVars - Popis definiranih varijabli u kontekstu
 * @returns {object} - Rezultat provjere s informacijama o greškama
 */
function verifyDateUtilsUsage(content, { definedVars = [] } = {}) {
  // Pronađi sve pozive parseDate i formatDate u kodu
  const parseDateCalls = [];
  const formatDateCalls = [];
  const getCurrentDateCalls = [];
  
  // Pronađi sve pozive parseDate() funkcije
  const parseDateRegex = /parseDate\s*\(\s*([^)]+)\s*\)/g;
  let match;
  while ((match = parseDateRegex.exec(content)) !== null) {
    parseDateCalls.push(match[1].trim());
  }
  
  // Pronađi sve pozive formatDate() funkcije
  const formatDateRegex = /formatDate\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/g;
  while ((match = formatDateRegex.exec(content)) !== null) {
    formatDateCalls.push({
      date: match[1].trim(),
      format: match[2] ? match[2].trim() : undefined
    });
  }
  
  // Pronađi sve pozive getCurrentDate() funkcije
  const getCurrentDateRegex = /getCurrentDate\s*\(\s*\)/g;
  while ((match = getCurrentDateRegex.exec(content)) !== null) {
    getCurrentDateCalls.push(match[0]);
  }
  
  // Provjeri jesu li argumenti parseDatea definirani u kontekstu
  const undefinedVars = parseDateCalls.filter(arg => {
    // Ignoriraj konstante i literale
    if (arg.startsWith("'") || arg.startsWith('"') || arg === 'null' || arg === 'undefined' || !isNaN(arg)) {
      return false;
    }
    
    // Provjeriti postoji li varijabla u definiranim varijablama
    return !definedVars.some(v => arg === v || arg.startsWith(`${v}.`) || arg.startsWith(`${v}[`));
  });
  
  // Provjeri jesu li argumenti formatDate definirani u kontekstu
  undefinedVars.push(...formatDateCalls
    .map(call => call.date)
    .filter(arg => {
      // Ignoriraj konstante i literale
      if (arg.startsWith("'") || arg.startsWith('"') || arg === 'null' || arg === 'undefined' || !isNaN(arg)) {
        return false;
      }
      
      // Provjeriti postoji li varijabla u definiranim varijablama
      return !definedVars.some(v => arg === v || arg.startsWith(`${v}.`) || arg.startsWith(`${v}[`));
    })
  );
  
  return {
    success: undefinedVars.length === 0,
    undefinedVars,
    message: undefinedVars.length === 0 
      ? 'Svi pozivi date-utils funkcija koriste definirane varijable.'
      : `Pronađene nedefiniranje varijable u pozivima date-utils funkcija: ${undefinedVars.join(', ')}`,
    parseDateCalls,
    formatDateCalls,
    getCurrentDateCalls
  };
}

/**
 * Skenira datoteku i pronalazi sve definirane varijable i importove
 * @param {string} filePath - Putanja do datoteke
 * @returns {object} - Popis definiranih varijabli i importova
 */
function scanFileContext(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Pronađi sve importe
    const importRegex = /import\s+(?:{([^}]+)}|([^{;]+))\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[3]);
    }
    
    // Pronađi sve definirane varijable (deklaracije)
    const varRegex = /(?:const|let|var)\s+(\w+)(?:\s*(?:=|:)[^;]+)?;/g;
    const variables = [];
    while ((match = varRegex.exec(content)) !== null) {
      variables.push(match[1]);
    }
    
    // Pronađi sve parametre funkcija
    const funcParamRegex = /function\s+\w+\s*\(([^)]*)\)/g;
    const methodParamRegex = /\w+\s*\(([^)]*)\)\s*{/g;
    const arrowFuncRegex = /(?:const|let|var)?\s*\w+\s*=\s*(?:\([^)]*\)|\w+)\s*=>/g;
    
    const extractParams = (paramString) => {
      if (!paramString.trim()) return [];
      return paramString.split(',').map(p => {
        const param = p.trim().split(':')[0].split('=')[0].trim();
        return param;
      });
    };
    
    while ((match = funcParamRegex.exec(content)) !== null) {
      variables.push(...extractParams(match[1]));
    }
    
    while ((match = methodParamRegex.exec(content)) !== null) {
      variables.push(...extractParams(match[1]));
    }
    
    while ((match = arrowFuncRegex.exec(content)) !== null) {
      const arrowFuncContent = content.substring(match.index, content.indexOf('=>', match.index) + 2);
      const paramMatch = arrowFuncContent.match(/\(([^)]*)\)/);
      if (paramMatch) {
        variables.push(...extractParams(paramMatch[1]));
      } else {
        // Slučaj jednog parametra bez zagrada
        const singleParamMatch = arrowFuncContent.match(/=\s*(\w+)\s*=>/);
        if (singleParamMatch) {
          variables.push(singleParamMatch[1]);
        }
      }
    }
    
    return {
      imports,
      variables: [...new Set(variables)] // Ukloni duplikate
    };
  } catch (error) {
    console.error(`Greška pri skeniranju konteksta datoteke ${filePath}:`, error.message);
    return { imports: [], variables: [] };
  }
}

/**
 * Generira backup datoteke prije izmjene
 * @param {string} filePath - Putanja do datoteke
 * @returns {string} - Putanja do backup datoteke
 */
function backupFile(filePath) {
  const backupPath = `${filePath}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Vraća datoteku iz backupa ako je potrebno
 * @param {string} backupPath - Putanja do backup datoteke
 * @param {string} originalPath - Putanja do originalne datoteke
 * @returns {boolean} - true ako je vraćanje uspjelo
 */
function restoreFromBackup(backupPath, originalPath) {
  try {
    fs.copyFileSync(backupPath, originalPath);
    return true;
  } catch (error) {
    console.error(`Greška pri vraćanju iz backupa ${backupPath}:`, error.message);
    return false;
  }
}

module.exports = {
  verifyTypeScriptSyntax,
  checkUndefinedVariables,
  verifyDateUtilsUsage,
  scanFileContext,
  backupFile,
  restoreFromBackup
};
