import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

async function syncTypes() {
    const sourceDir = path.join(projectRoot, 'frontend/shared/types');
    const targetDir = path.join(projectRoot, 'backend/src/shared/types');

    try {
        await fs.mkdir(targetDir, { recursive: true });
        const files = await fs.readdir(sourceDir);
        
        for (const file of files) {
            if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                const sourcePath = path.join(sourceDir, file);
                const targetPath = path.join(targetDir, file);
                
                let content = await fs.readFile(sourcePath, 'utf8');
                
                // Fix imports (don't duplicate .js if it's already there)
                content = content.replace(
                    /from ['"]\.\/([^'"]+?)(?:\.js)?['"]/g, 
                    "from './$1.js'"
                );
                
                // Fix exports in index.ts (don't duplicate .js)
                if (file === 'index.ts') {
                    content = content.replace(
                        /export \* from ['"]\.\/([^'"]+?)(?:\.js)?['"]/g,
                        "export * from './$1.js'"
                    );
                }
                
                await fs.writeFile(targetPath, content);
                console.log(`✅ Synced: ${file}`);
            }
        }
        
        console.log('🎉 Types sync completed successfully!');
    } catch (error) {
        console.error('❌ Error syncing types:', error);
        process.exit(1);
    }
}

syncTypes();
