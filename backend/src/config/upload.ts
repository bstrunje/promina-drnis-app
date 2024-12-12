import path from 'path';
import multer from 'multer';
import { Request } from 'express';
import fs from 'fs/promises';

interface MulterCallback {
    (error: Error | null, value?: any): void;
}

const UPLOAD_PATH = 'uploads/profile_images';
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png'];

const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: MulterCallback) => {
        cb(null, UPLOAD_PATH);
    },
    filename: (req: Request, file: Express.Multer.File, cb: MulterCallback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `member-${req.params.memberId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

export const uploadConfig = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb) => {
        if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
            return;
        }
        cb(null, true);
    }
});

export const PROFILE_IMAGE_CONFIG = {
    width: 240,
    height: 320,
    path: UPLOAD_PATH
};