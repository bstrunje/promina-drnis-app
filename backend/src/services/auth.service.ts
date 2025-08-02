// src/services/auth.service.ts
import { Member } from '../shared/types/member.js';
import authRepository from '../repositories/auth.repository.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import prisma from '../utils/prisma.js';

interface LoginResponse {
    token: string;
    member: {
        id: number;
        full_name: string;
        role: Member['role'];
    };
}

const authService = {
    async login(credentials: { full_name: string; password: string }): Promise<LoginResponse> {
        const user = await authRepository.findUserByFullName(credentials.full_name);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (!user.password_hash) {
            throw new Error('Password not set for user');
        }

        const validPassword = await bcrypt.compare(credentials.password, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = jwt.sign(
            {
                id: user.member_id,
                role: user.role
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        // OPTIMIZACIJA: Zamjena legacy db.query s Prisma update operacijom
        console.log(`[AUTH] Ažuriram last_login za člana ID: ${user.member_id}`);
        
        try {
            await prisma.member.update({
                where: {
                    member_id: user.member_id
                },
                data: {
                    last_login: new Date()
                }
            });
            
            console.log(`[AUTH] Last_login uspješno ažuriran za člana ${user.member_id}`);
        } catch (error) {
            console.error(`[AUTH] Greška prilikom ažuriranja last_login za člana ${user.member_id}:`, error);
            
            // Fallback na legacy db.query ako Prisma ne radi
            try {
                console.log(`[AUTH] Fallback na legacy db.query za člana ${user.member_id}...`);
                await db.query(
                    'UPDATE members SET last_login = CURRENT_TIMESTAMP WHERE member_id = $1',
                    [user.member_id]
                );
            } catch (fallbackError) {
                console.error(`[AUTH] Fallback greška za člana ${user.member_id}:`, fallbackError);
                // Ne prekidamo login proces zbog greške u ažuriranju last_login
            }
        }

        return {
            token,
            member: {
                id: user.member_id,
                full_name: `${user.first_name} ${user.last_name}`,
                role: user.role
            }
        };
    },

    async searchMembers(searchTerm: string) {
        return await authRepository.searchMembers(searchTerm);
    },

    async getMemberById(memberId: number): Promise<Member | null> {
        return await authRepository.findUserById(memberId);
    },

    async assignPassword(memberId: number, hashedPassword: string, cardNumber: string): Promise<void> {
        await authRepository.updateMemberWithCardAndPassword(memberId, hashedPassword, cardNumber);
    }
};

export default authService;