import { PoolClient } from 'pg';
import  DatabaseTransactionClient  from '../utils/db';
import { DatabaseError } from '../utils/db';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import { User } from '../types/user';
import { sendPasswordEmail } from '../services/email.service';

interface UserRegistration {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
}

interface UserLogin {
    username: string;
    password: string;
}

interface LocalUser {
    id: number;
    username: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  }

  interface UserWithMemberDetails extends User {
    first_name: string;
    last_name: string;
  }

interface PasswordUpdate {
    userId: number;
    suffixNumbers: string;
}

interface DatabaseTransactionClient {
  query: (query: string, params: any[]) => Promise<any>;
  // Add other methods and properties as needed
}

function validatePassword(password: string, suffixNumbers?: string): { 
    isValid: boolean; 
    message?: string;
    formattedPassword?: string;
} {
    // Basic password validation (before suffix)
    if (password.length < 6) {
        return { 
            isValid: false, 
            message: 'Password must be at least 6 characters long before the -isk- suffix' 
        };
    }

    // If suffix numbers are provided, validate them
    if (suffixNumbers) {
        if (!/^\d{5}$/.test(suffixNumbers)) {
            return {
                isValid: false,
                message: 'Suffix must be exactly 5 digits'
            };
        }
        return {
            isValid: true,
            formattedPassword: `${password}-isk-${suffixNumbers}`
        };
    }

    // For initial registration without suffix
    return { isValid: true };
}

const authController = {
    // Initial registration without password suffix
    async registerInitial(req: Request<{}, {}, UserRegistration>, res: Response): Promise<void> {
        try {
            const { username, email, password, firstName, lastName, role } = req.body;

            // Validate initial password
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                res.status(400).json({ message: passwordValidation.message });
                return;
            }

            // Check if user already exists
            const userExists = await db.query<User>(
                'SELECT * FROM users WHERE username = $1 OR email = $2',
                [username, email],
                { singleRow: true }
            );

            if (userExists && userExists.rowCount && userExists.rowCount > 0) {
                res.status(400).json({ 
                    message: 'User with this username or email already exists' 
                });
                return;
            }

            // Store user with temporary status
            await db.transaction(async (client: PoolClient) => {
                // Insert user with temporary password and pending status
                const result = await client.query<User>(
                    `INSERT INTO users (username, email, password, role, status)
                     VALUES ($1, $2, $3, $4, 'pending')
                     RETURNING id, username, email, role`,
                    [username, email, password, role || 'member']
                );

                const user = result.rows[0];

                // Insert member details
                await client.query(
                    `INSERT INTO members (user_id, first_name, last_name, join_date)
                     VALUES ($1, $2, $3, CURRENT_DATE)`,
                    [user.id, firstName, lastName]
                );

                res.status(201).json({
                    message: 'User pre-registered successfully. Awaiting admin password configuration.',
                    userId: user.id,
                    username: user.username,
                    email: user.email
                });
            });
        } catch (error) {
            console.error('Registration error:', error);
            if (error instanceof DatabaseError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Error registering user' });
            }
        }
    },

    // Admin endpoint to set or update password suffix
    async setPasswordSuffix(req: Request<{}, {}, PasswordUpdate>, res: Response): Promise<void> {
        try {
            const { userId, suffixNumbers } = req.body;

            // Get user's current password
            const userResult = await db.query<UserWithMemberDetails>(
                'SELECT password, email, username, first_name, last_name FROM users u JOIN members m ON u.id = m.user_id WHERE u.id = $1',
                [userId],
                { singleRow: true }
            );

            if (userResult.rowCount === 0) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            const user = userResult.rows[0];
            const currentPassword = user.password.split('-isk-')[0]; // Get base password

            // Validate and format new password
            const passwordValidation = validatePassword(currentPassword, suffixNumbers);
            if (!passwordValidation.isValid) {
                res.status(400).json({ message: passwordValidation.message });
                return;
            }

            const finalPassword = passwordValidation.formattedPassword!;
            const hashedPassword = await bcrypt.hash(finalPassword, 10);

            // Update password and status
            await db.transaction(async (client: DatabaseTransactionClient) => {
                await client.query(
                    `UPDATE users 
                     SET password = $1, status = 'active', updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $2`,
                    [hashedPassword, userId]
                );

                // Send email with the new password
                await sendPasswordEmail({
                    to: user.email,
                    username: user.username,
                    password: finalPassword,
                    firstName: user.first_name,
                    lastName: user.last_name
                });

                res.json({
                    message: 'Password suffix set and email sent successfully',
                    userId,
                    emailSent: true
                });
            });
        } catch (error) {
            console.error('Password suffix update error:', error);
            if (error instanceof DatabaseError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Error updating password suffix' });
            }
        }
    },

    // Login remains mostly the same but needs to check for active status
    async login(req: Request<{}, {}, UserLogin>, res: Response): Promise<void> {
        try {
            const { username, password } = req.body;

            const result = await db.query<User>(
                'SELECT * FROM users WHERE username = $1 AND status = \'active\'',
                [username],
                { singleRow: true }
            );

            if (result.rowCount === 0) {
                res.status(401).json({ message: 'Invalid credentials or account not active' });
                return;
            }

            const user = result.rows[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                res.status(401).json({ message: 'Invalid credentials' });
                return;
            }

            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username,
                    role: user.role 
                },
                process.env.JWT_SECRET!,
                { expiresIn: '24h' }
            );

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                token
            });
        } catch (error) {
            console.error('Login error:', error);
            if (error instanceof DatabaseError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Error logging in' });
            }
        }
    }
};

export default authController;