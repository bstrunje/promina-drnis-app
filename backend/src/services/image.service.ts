import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PROFILE_IMAGE_CONFIG } from '../config/upload.js';
import memberRepository from '../repositories/member.repository.js';
import { Express } from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
            // Create a unique filename for the processed image
            const filename = `member_${memberId}_${Date.now()}.jpg`;
            const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');
            const outputPath = path.join(uploadDir, filename);

            // Process the image with sharp - resize and optimize it
            await sharp(file.path)
                .resize(PROFILE_IMAGE_CONFIG.width, PROFILE_IMAGE_CONFIG.height, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 80 })
                .toFile(outputPath);

            // Try to delete the original temporary file, but don't fail if it errors
            try {
                await fs.unlink(file.path);
            } catch (unlinkError) {
                // Log the error but continue processing
                console.warn(`Could not delete temporary file ${file.path}: ${unlinkError}`);
            }

            // Generate the URL path for the image
            const imagePath = `/uploads/${filename}`;

            // Update member profile in database
            await memberRepository.updateProfileImage(memberId, imagePath);

            return imagePath;
        } catch (error) {
            console.error('Error processing profile image:', error);
            throw error;
        }
    },

    async deleteProfileImage(
        memberId: number
    ): Promise<void> {
        try {
            // First get the current image path
            const imagePath = await memberRepository.getProfileImage(memberId);

            if (imagePath) {
                const fullPath = path.join(__dirname, '..', '..', 'public', imagePath);

                // Try to delete the file, but don't fail if it doesn't exist
                try {
                    await fs.unlink(fullPath);
                } catch (unlinkError) {
                    // Just log the error if the file doesn't exist
                    console.warn(`Could not delete image file ${fullPath}: ${unlinkError}`);
                }
            }

            // Update the database regardless of whether file deletion worked
            await memberRepository.updateProfileImage(memberId, '');
        } catch (error) {
            console.error('Error deleting profile image:', error);
            throw error;
        }
    }
};

export default imageService;