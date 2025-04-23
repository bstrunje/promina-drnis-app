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

            // Try to delete original file but continue if it fails
            try {
                await fs.unlink(file.path);
            } catch (unlinkError: unknown) {
                console.warn(`Could not delete original file: ${file.path}. Error: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`);
                // Continue execution - we don't want to fail the upload just because we couldn't clean up
            }

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
            if (!member?.profile_image_path) {
                console.log(`Member ${memberId} has no profile image to delete`);
                return;
            }

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
                try {
                    await fs.unlink(filePath);
                    console.log(`Successfully deleted profile image at ${filePath}`);
                } catch (unlinkError: unknown) {
                    console.warn(`Could not delete file: ${filePath}. Error: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`);
                    // Continue execution - we'll still update the database
                }
            } catch (e) {
                console.warn(`File not found: ${filePath}, continuing with database update`);
            }

            // Update database to remove reference regardless of file operation success
            await memberRepository.updateProfileImage(memberId, '');
            console.log(`Successfully cleared profile_image_path in database for member ${memberId}`);
        } catch (error) {
            console.error('Error in deleteProfileImage:', error);
            throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

export default imageService;