import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import config from '../config/config.js';

const authController = {
    // Register new user
    async register(req, res) {
        try {
            const { username, email, password, firstName, lastName } = req.body;

            // Check if user exists
            const userExists = await db.query(
                'SELECT * FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (userExists.rows.length > 0) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Begin transaction
            const client = await db.getClient();
            try {
                await client.query('BEGIN');

                // Create user
                const userResult = await client.query(
                    `INSERT INTO users (username, email, password_hash, role)
                     VALUES ($1, $2, $3, 'member')
                     RETURNING user_id`,
                    [username, email, hashedPassword]
                );

                // Create member profile
                await client.query(
                    `INSERT INTO members (user_id, first_name, last_name, join_date)
                     VALUES ($1, $2, $3, CURRENT_DATE)`,
                    [userResult.rows[0].user_id, firstName, lastName]
                );

                await client.query('COMMIT');

                res.status(201).json({ message: 'User registered successfully' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Error registering user' });
        }
    },

    // Login user
    async login(req, res) {
        try {
            const { username, password } = req.body;

            // Get user
            const result = await db.query(
                `SELECT u.*, m.member_id, m.first_name, m.last_name
                 FROM users u
                 LEFT JOIN members m ON u.user_id = m.user_id
                 WHERE u.username = $1`,
                [username]
            );

            const user = result.rows[0];

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
                [user.user_id]
            );

            // Create token
            const token = jwt.sign(
                { 
                    userId: user.user_id,
                    memberId: user.member_id,
                    username: user.username,
                    role: user.role 
                },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            res.json({
                token,
                user: {
                    userId: user.user_id,
                    memberId: user.member_id,
                    username: user.username,
                    role: user.role,
                    firstName: user.first_name,
                    lastName: user.last_name
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error logging in' });
        }
    }
};

module.exports = authController;