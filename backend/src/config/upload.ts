import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { FileFilterCallback } from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROFILE_IMAGE_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
  path: path.resolve(__dirname, '..', '..', 'uploads'),
  width: 300,  // default width for profile images
  height: 300  // default height for profile images
};

const storage = multer.diskStorage({
  destination: (_req: any, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Prioritize UPLOADS_DIR for persistent storage, with fallbacks for other environments
    const uploadPath = process.env.UPLOADS_DIR || 
      (process.env.NODE_ENV === 'production'
        ? '/app/uploads' // Legacy fallback for production
        : './uploads');   // Development fallback
    cb(null, uploadPath);
  },
  
  filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const multerConfig = multer({
  storage: storage,
  fileFilter: (_req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    console.log("Received file upload:", file.mimetype);
    
    if (PROFILE_IMAGE_CONFIG.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error(`Rejected file upload with MIME type: ${file.mimetype}`);
      cb(new Error(`Invalid file type. Supported formats: ${PROFILE_IMAGE_CONFIG.allowedTypes.join(', ')}`));
    }
  },
  limits: {
    fileSize: PROFILE_IMAGE_CONFIG.maxSize
  }
});

export const uploadConfig = multerConfig;
export default multerConfig;