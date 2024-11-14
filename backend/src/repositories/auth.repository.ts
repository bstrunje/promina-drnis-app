// src/repositories/auth.repository.ts
import db from '../utils/db';
import { User, UserRegistrationData } from '../types/user';
import { PoolClient } from 'pg';

const authRepository = {
    async findUserByUsername(username: string): Promise<User | null> {
        const result = await db.query(
            `SELECT u.*, m.member_id, m.first_name, m.last_name
             FROM users u
             LEFT JOIN members m ON u.user_id = m.user_id
             WHERE u.username = $1`,
            [username]
        );
        return result.rows[0] || null;
    },

    async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        return result.rows[0] || null;
    },

    async createUserWithMember(userData: UserRegistrationData, client: PoolClient): Promise<{ user_id: number }> {
        // Create user
        const userResult = await client.query(
            `INSERT INTO users (username, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING user_id`,
            [userData.username, userData.email, userData.hashedPassword, userData.role || 'member']
        );

        // Create member profile
        await client.query(
            `INSERT INTO members (user_id, first_name, last_name, join_date)
             VALUES ($1, $2, $3, CURRENT_DATE)`,
            [userResult.rows[0].user_id, userData.firstName, userData.lastName]
        );

        return { user_id: userResult.rows[0].user_id };
    },

    async updateLastLogin(userId: number): Promise<void> {
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
            [userId]
        );
    },

    async generateUsername(firstName: string, lastName: string): Promise<string> {
        const baseUsername = `${firstName} ${lastName}-isk-`;
        let username = '';
        let isUnique = false;

        while (!isUnique) {
            const randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit number
            username = `${baseUsername}${randomNum}`;

            const result = await db.query('SELECT 1 FROM users WHERE username = $1', [username]);
            isUnique = result.rows.length === 0;
        }

        return username;
    },

    async setInitialPassword(userId: number, password: string): Promise<void> {
        await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [password, userId]);
    }
};

export default authRepository;