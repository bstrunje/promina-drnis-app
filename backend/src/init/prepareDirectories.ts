import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function prepareDirectories() {
  // For Render deployment, use the absolute path
  const baseUploadsDir = process.env.NODE_ENV === 'production'
    ? '/app/uploads'
    : path.join(__dirname, '..', '..', 'uploads');
    
  const profileImagesDir = path.join(baseUploadsDir, 'profile_images');
  
  // Create directory structure
  const directories = [
    baseUploadsDir,
    profileImagesDir
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  });
}

// Export a function to move old files to the new structure if needed
export async function migrateExistingFiles() {
  const baseUploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const profileImagesDir = path.join(baseUploadsDir, 'profile_images');
  
  try {
    const files = await fs.promises.readdir(baseUploadsDir);
    
    // Move member_* files to profile_images directory
    for (const file of files) {
      if (file.startsWith('member_') && !file.includes('profile_images')) {
        const sourcePath = path.join(baseUploadsDir, file);
        const destPath = path.join(profileImagesDir, file);
        
        try {
          await fs.promises.rename(sourcePath, destPath);
          console.log(`Moved ${file} to profile_images directory`);
        } catch (error) {
          console.error(`Failed to move file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error migrating existing files:', error);
  }
}
