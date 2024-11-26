import { User, UserLogin } from '../types/user.js';
import authRepository from '../repositories/auth.repository.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import { PoolClient } from 'pg';

const authService = {
    async login(credentials: UserLogin) {
        const user = await authRepository.findUserByFullName(credentials.full_name);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const validPassword = await bcrypt.compare(credentials.password, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await db.query(
            'UPDATE members SET last_login = CURRENT_TIMESTAMP WHERE member_id = $1',
            [user.member_id]
        );

        const token = jwt.sign(
            {
                member_id: user.member_id,
                role: user.role
            },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                member_id: user.member_id,
                full_name: user.full_name,
                role: user.role
            }
        };
    }
};

export default authService;