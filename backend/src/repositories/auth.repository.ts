// backend/src/repositories/auth.repository.js
import db from '../utils/db.js';

const authRepository = {
    async findUserByUsername(username) {
        const result = await db.query(
            `SELECT u.*, m.member_id, m.first_name, m.last_name
             FROM users u
             LEFT JOIN members m ON u.user_id = m.user_id
             WHERE u.username = $1`,
            [username]
        );
        return result.rows[0];
    },

    async findUserByEmailOrUsername(email, username) {
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        return result.rows[0];
    },

    async createUserWithMember(userData, client) {
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

        return userResult.rows[0];
    },

    async updateLastLogin(userId) {
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
            [userId]
        );
    }
};

export default authRepository;