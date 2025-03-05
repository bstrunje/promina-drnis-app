import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PROFILE_IMAGE_CONFIG } from '../config/upload.js';
import memberRepository from '../repositories/member.repository.js';
import { Express } from 'express';

interface MulterFile {
    path: string;
    filename: string;
    originalname: string;
    fieldname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    size: number;
}

const imageService = {
    async processAndSaveProfileImage(
        file: MulterFile | Express.Multer.File,
        memberId: number
    ): Promise<string> {
        try {
            // Use profile_images subdirectory
            const uploadsDir = process.env.NODE_ENV === 'production'
                ? '/app/uploads'
                : path.resolve(__dirname, '..', '..', 'uploads');
            
            const profileImagesDir = path.join(uploadsDir, 'profile_images');
            
            // Ensure directory exists
            await fs.mkdir(profileImagesDir, { recursive: true });

            const processedFileName = `processed-${file.filename}`;
            const processedFilePath = path.join(profileImagesDir, processedFileName);

            // Process image with sharp
            await sharp(file.path)
                .resize({
                    width: PROFILE_IMAGE_CONFIG.width,
                    height: PROFILE_IMAGE_CONFIG.height,
                    fit: 'cover',
                    position: 'center'
                })
                .toFile(processedFilePath);

            // Delete original file
            await fs.unlink(file.path);

            // Update database
            await memberRepository.updateProfileImage(memberId, processedFileName);

            return processedFileName;
        } catch (error) {
            // Clean up on error
            if (file.path) {
                await fs.unlink(file.path).catch(() => {});
            }
            throw error;
        }
    },

    async deleteProfileImage(
        memberId: number
    ): Promise<void> {
        const imagePath = await memberRepository.getProfileImage(memberId);
        if (imagePath) {
            const fullPath = path.join(PROFILE_IMAGE_CONFIG.path, imagePath);
            await fs.unlink(fullPath).catch(() => {});
            await memberRepository.updateProfileImage(memberId, '');
        }
    }
};

export default imageService;