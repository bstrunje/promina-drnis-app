import { PoolClient } from 'pg';
import DatabaseTransactionClient from '../utils/db.js';
import { DatabaseError } from '../utils/db.js';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import { User } from '../types/user.js';
import { sendPasswordEmail } from '../services/email.service.js';

// Interfaces
interface UserRegistration {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
}

interface UserLogin {
    full_name: string;
    password: string;
}

interface SetPasswordRequest {
    member_id: number;
    suffix_numbers: string;
}

interface DatabaseUser {
    id: number;
    user_id: number;
    username: string;
    email: string;
    role_name: string;
    is_active: boolean;
}

interface MemberRegistration {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status: string;
    tshirt_size: string;
    shell_jacket_size: string;
}

interface Member {
    member_id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    password_hash: string;
    role: 'member' | 'admin' | 'superuser';
    status: string;
    last_login?: Date;
    date_of_birth: Date;
    oib: string;
    cell_phone: string;
    city: string;
    street_address: string;
    email: string;
    life_status?: string;
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
                     RETURNING member_id, username, email, role`,
                    [username, email, password, role || 'member']
                );

                const user = result.rows[0];

                // Insert member details
                await client.query(
                    `INSERT INTO members (user_id, first_name, last_name, join_date)
                     VALUES ($1, $2, $3, CURRENT_DATE)`,
                    [user.member_id, firstName, lastName]
                );

                res.status(201).json({
                    message: 'User pre-registered successfully. Awaiting admin password configuration.',
                    user_Id: user.member_id,
                    username: user.full_name,
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

    async login(req: Request<{}, {}, UserLogin>, res: Response): Promise<void> {
        try {
            const { full_name, password } = req.body;
            console.log(`Login attempt for member: ${full_name}`);
    
            const result = await db.query<Member>(
                'SELECT * FROM members WHERE full_name = $1 AND status = \'active\'',
                [full_name],
                { singleRow: true }
            );
    
            if (result.rowCount === 0) {
                console.log(`Member not found or not active: ${full_name}`);
                res.status(401).json({ message: 'Invalid credentials or account not active' });
                return;
            }
    
            const member = result.rows[0];
            console.log(`Member found: ${full_name}, checking password`);
    
            const validPassword = await bcrypt.compare(password, member.password_hash);
            console.log(`Password valid: ${validPassword}`);
    
            if (!validPassword) {
                console.log(`Invalid password for member: ${full_name}`);
                res.status(401).json({ message: 'Invalid credentials' });
                return;
            }
    
            console.log(`Password verified for member: ${full_name}, generating token`);
    
            const token = jwt.sign(
                { 
                    id: member.member_id, 
                    full_name: member.full_name,
                    role: member.role 
                },
                process.env.JWT_SECRET!,
                { expiresIn: '24h' }
            );
    
            // Update last login
            await db.query(
                'UPDATE members SET last_login = CURRENT_TIMESTAMP WHERE member_id = $1',
                [member.member_id]
            );
    
            res.json({
                member: {
                    id: member.member_id,
                    full_name: member.full_name,
                    role: member.role
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
    },

    async registerMember(req: Request<{}, {}, MemberRegistration>, res: Response) {
        try {
            const {
                first_name,
                last_name,
                date_of_birth,
                street_address,
                city,
                oib,
                cell_phone,
                email,
                life_status,
                tshirt_size,
                shell_jacket_size
            } = req.body;

            // Check if OIB exists
            const existingMember = await db.query(
                'SELECT member_id FROM members WHERE oib = $1',
                [oib],
                { singleRow: true }
            );
            
            // Update this condition to handle possible null value
            if (existingMember?.rowCount && existingMember.rowCount > 0) {
                return res.status(400).json({
                    message: 'Member with this OIB already exists'
                });
            }

            // Insert new member
            const result = await db.query<Member>(
                `INSERT INTO members (
                    first_name, last_name, date_of_birth, street_address, 
                    city, oib, cell_phone, email, life_status, 
                    tshirt_size, shell_jacket_size
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING member_id`,
                [
                    first_name, last_name, date_of_birth, street_address,
                    city, oib, cell_phone, email, life_status,
                    tshirt_size, shell_jacket_size
                ]
            );

            res.status(201).json({
                message: 'Registration successful. Please wait for admin approval.',
                member_id: result.rows[0].member_id,
                status: 'pending'
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                message: error instanceof Error ? error.message : 'Registration failed'
            });
        }
    },

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
            const currentPassword = user.full_name.split('-isk-')[0]; // Get base password

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
                    username: user.full_name,
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

    async searchMembers(req: Request, res: Response) {
        try {
            const { searchTerm } = req.query;
            const query = `
                SELECT member_id, full_name 
                FROM members 
                WHERE full_name ILIKE $1 
                    AND status = 'active' | 'pasive'
                ORDER BY full_name 
                LIMIT 10`;
    
            const result = await db.query(query, [`%${searchTerm}%`]);
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ 
                message: 'Error searching members', 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    },

    setMemberPassword: async (req: Request<{}, {}, SetPasswordRequest>, res: Response): Promise<void> => {
        try {
            const { member_id, suffix_numbers } = req.body;

            // Validate suffix format (exactly 5 digits)
            if (!/^\d{5}$/.test(suffix_numbers)) {
                res.status(400).json({ message: 'Suffix must be exactly 5 digits' });
                return;
            }

            // Get member details
            const memberResult = await db.query<Member>(
                'SELECT first_name, last_name, email, status FROM members WHERE member_id = $1',
                [member_id],
                { singleRow: true }
            );

            if (!memberResult.rowCount) {
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            const member = memberResult.rows[0];

            // Check if member is in pending status
            if (member.status !== 'pending') {
                res.status(400).json({ message: 'Can only set password for pending members' });
                return;
            }

            // Create password in required format
            const password = `${member.first_name} ${member.last_name}-isk-${suffix_numbers}`;
            
            // Hash the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Update member with password and change status to active
            await db.query(
                'UPDATE members SET password_hash = $1, status = $2 WHERE member_id = $3',
                [hashedPassword, 'active', member_id]
            );

            res.json({ 
                message: 'Password set successfully',
                member_id,
                status: 'active'
            });

        } catch (error) {
            console.error('Set password error:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Error setting password'
            });
        }
    }
};

export default authController;