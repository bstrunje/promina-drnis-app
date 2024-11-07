import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import { authMiddleware, checkRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                message: 'Please provide both username and password' 
            });
        }

        // Get user with role
        const result = await db.query(
            `SELECT u.*, m.member_id, m.user_id, r.role_name
             FROM users u
             LEFT JOIN members m ON u.id = m.user_id
             LEFT JOIN user_roles ur ON u.id = ur.user_id
             LEFT JOIN roles r ON ur.role_name = r.role_name
             WHERE u.username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({ message: 'Account is inactive' });
        }

        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Create JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role_name 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Send response
        res.json({ 
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role_name,
                memberId: user.member_id
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Register new user (requires admin or super_user role)
router.post('/register', authMiddleware, checkRole(['administrator', 'super_user']), async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role = 'member' } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ 
                message: 'Please provide username, email, and password' 
            });
        }

        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');

            // Check if user exists
            const userExists = await client.query(
                'SELECT * FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (userExists.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Username or email already exists' });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            const userResult = await client.query(
                `INSERT INTO users (username, email, password, first_name, last_name, is_active)
                 VALUES ($1, $2, $3, $4, $5, true)
                 RETURNING id`,
                [username, email, hashedPassword, firstName, lastName]
            );

            // Get role ID
            const roleResult = await client.query(
                'SELECT role_id FROM roles WHERE role_name = $1',
                [role]
            );

            if (roleResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Invalid role specified' });
            }

            // Assign role
            await client.query(
                'INSERT INTO user_roles (user_id, role_id, granted_by) VALUES ($1, $2, $3)',
                [userResult.rows[0].id, roleResult.rows[0].role_id, req.user.id]
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
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.*, m.member_id, r.role_name
             FROM users u
             LEFT JOIN members m ON u.id = m.user_id
             LEFT JOIN user_roles ur ON u.id = ur.user_id
             LEFT JOIN roles r ON ur.role_id = r.role_id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role_name,
            memberId: user.member_id,
            isActive: user.is_active,
            lastLogin: user.last_login
        });
    } catch (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                message: 'Please provide both current and new password' 
            });
        }

        // Get user's current password hash
        const result = await db.query(
            'SELECT password FROM users WHERE id = $1',
            [req.user.id]
        );

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
});

export default router;