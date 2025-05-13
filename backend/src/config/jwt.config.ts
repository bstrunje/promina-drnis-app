import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in environment variables');
}

if (!process.env.REFRESH_TOKEN_SECRET && !process.env.JWT_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET or JWT_SECRET must be defined in environment variables');
}

// Za refresh token koristimo JWT_SECRET kao fallback ako REFRESH_TOKEN_SECRET nije definiran
// Ovo omogućava kompatibilnost s postojećim postavkama
export const JWT_SECRET: string = process.env.JWT_SECRET;
export const REFRESH_TOKEN_SECRET: string = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
