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
    cb(null, path.resolve(__dirname, '..', '..', 'uploads'));
  },
  
  filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const multerConfig = multer({
  storage: storage,
  fileFilter: (_req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (PROFILE_IMAGE_CONFIG.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'));
    }
  },
  limits: {
    fileSize: PROFILE_IMAGE_CONFIG.maxSize
  }
});

export const uploadConfig = multerConfig;
export default multerConfig;