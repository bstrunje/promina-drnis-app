import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PROFILE_IMAGE_CONFIG } from '../config/upload.js';
import memberRepository from '../repositories/member.repository.js';
import { Express } from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Dodaj potrebne konstante za ES module kontekst
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
            // Use hardcoded paths instead of __dirname
            const uploadsDir = process.env.NODE_ENV === 'production' 
                ? '/app/uploads'
                : './uploads'; // Koristi relativnu putanju
            
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
            const profileImagePath = `/uploads/profile_images/${processedFileName}`;
            
            await memberRepository.updateProfileImage(memberId, profileImagePath);

            return profileImagePath;
        } catch (error) {
            console.error('Error processing image:', error);
            throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    async deleteProfileImage(
        memberId: number
    ): Promise<void> {
        try {
            const member = await memberRepository.findById(memberId);
            if (!member?.profile_image_path) return;

            // Extract filename from path
            const filename = path.basename(member.profile_image_path);
            
            // Use relative path for accessing the uploads directory
            const uploadsDir = process.env.NODE_ENV === 'production' 
                ? '/app/uploads'
                : './uploads';
            
            const profileImagesDir = path.join(uploadsDir, 'profile_images');
            const filePath = path.join(profileImagesDir, filename);

            // Check if file exists before trying to delete
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
            } catch (e) {
                console.warn(`File not found: ${filePath}`);
            }

            // Update database to remove reference
            await memberRepository.updateProfileImage(memberId, '');
        } catch (error) {
            console.error('Error deleting image:', error);
            throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

export default imageService;