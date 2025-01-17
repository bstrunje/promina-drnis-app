import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = path.join(process.cwd(), 'src');

// Patterns to replace
const replacements = [
  {
    from: /@shared\/(.*?)['"|.js]/g,
    to: (match, p1) => `../shared/types/${p1}.js'`
  }
];

async function updateFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let wasUpdated = false;

    for (const { from, to } of replacements) {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        wasUpdated = true;
      }
    }

    if (wasUpdated) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Updated imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

async function findTypeScriptFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await findTypeScriptFiles(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      await updateFile(fullPath);
    }
  }
}

// Run the script
console.log('🔄 Starting import path updates...');
findTypeScriptFiles(srcDir)
  .then(() => console.log('✨ Import paths update completed!'))
  .catch(error => console.error('❌ Error:', error));
