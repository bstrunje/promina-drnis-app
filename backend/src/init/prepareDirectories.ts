import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

export function prepareDirectories() {
  // Skip directory creation on Vercel serverless environment
  if (process.env.VERCEL) {
    if (isDev) console.log('Skipping directory creation on Vercel serverless environment');
    return;
  }
  
  // For Render deployment, use the absolute path
  // Prioritize UPLOADS_DIR for persistent storage, with fallbacks for other environments
  const baseUploadsDir = process.env.UPLOADS_DIR || 
    (process.env.NODE_ENV === 'production'
      ? '/app/uploads' // Legacy fallback for production
      : path.join(__dirname, '..', '..', 'uploads')); // Development fallback
    
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
        if (isDev) console.log(`Created directory: ${dir}`);
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    } else {
      if (isDev) console.log(`Directory already exists: ${dir}`);
    }
  });
}

// Export a function to move old files to the new structure if needed
export async function migrateExistingFiles() {
  // This migration is for local development when structure changes.
  // It should not run or crash in production if the old directory doesn't exist.
  const baseUploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const profileImagesDir = path.join(baseUploadsDir, 'profile_images');

  // First, check if the source directory even exists. If not, do nothing.
  if (!fs.existsSync(baseUploadsDir)) {
    if (isDev) console.log(`Skipping file migration: Source directory ${baseUploadsDir} not found.`);
    return;
  }
  
  try {
    const files = await fs.promises.readdir(baseUploadsDir);
    
    // Move member_* files to profile_images directory
    for (const file of files) {
      if (file.startsWith('member_') && !file.includes('profile_images')) {
        const sourcePath = path.join(baseUploadsDir, file);
        const destPath = path.join(profileImagesDir, file);
        
        try {
          await fs.promises.rename(sourcePath, destPath);
          if (isDev) console.log(`Moved ${file} to profile_images directory`);
        } catch (error) {
          console.error(`Failed to move file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error migrating existing files:', error);
  }
}
