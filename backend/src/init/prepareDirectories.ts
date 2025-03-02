
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function prepareDirectories() {
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created uploads directory at ${uploadsDir}`);
    } catch (error) {
      console.error(`Failed to create uploads directory: ${error}`);
    }
  }
  
  // For Windows: We don't need to set permissions explicitly as Windows uses ACLs
  // For Unix systems like Linux/macOS, we would set permissions here
}

// Call this at app startup to ensure directories exist with correct permissions
