import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in environment variables');
}

export const JWT_SECRET: string = process.env.JWT_SECRET;
