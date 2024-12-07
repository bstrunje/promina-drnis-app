import { Request, Response } from 'express';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import { Member, MemberLoginData, MemberSearchResult } from '../../../shared/types/member.js';
import { PoolClient } from 'pg';
import { DatabaseError } from '../utils/db.js';
import authRepository from '../repositories/auth.repository.js';
import { sendPasswordEmail } from '../services/email.service.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: DatabaseUser
        }
    }
}

interface SetPasswordRequest {
    member_id: number;
    suffix_numbers: string;
}

function validatePassword(password: string, suffixNumbers?: string): { 
    isValid: boolean; 
    message?: string;
    formattedPassword?: string;
} {
    if (password.length < 6) {
        return { 
            isValid: false, 
            message: 'Password must be at least 6 characters long before the -isk- suffix' 
        };
    }

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

    return { isValid: true };
}

const authController = {
    async login(req: Request<{}, {}, MemberLoginData>, res: Response): Promise<void> {
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
    
            if (!member.password_hash) {
                console.log(`No password set for member: ${full_name}`);
                res.status(401).json({ message: 'Invalid credentials' });
                return;
            }
    
            const validPassword = await bcrypt.compare(password, member.password_hash);
            console.log(`Password valid: ${validPassword}`);
    
            if (!validPassword) {
                console.log(`Invalid password for member: ${full_name}`);
                res.status(401).json({ message: 'Invalid credentials' });
                return;
            }
    
            console.log(`Password verified for member: ${full_name}, generating token`);
    
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.error('JWT_SECRET not found in environment variables');
                res.status(500).json({ message: 'Server configuration error' });
                return;
            }
    
            try {
                const token = jwt.sign(
                    { 
                        id: member.member_id, 
                        full_name: member.full_name,
                        role: member.role 
                    },
                    jwtSecret,
                    { expiresIn: '24h' }
                );
    
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
                console.error('Token generation error:', error);
                res.status(500).json({ message: 'Error generating authentication token' });
                return;
            }
        } catch (error) {
            console.error('Login error:', error);
            if (error instanceof DatabaseError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Error logging in' });
            }
        }
    },

    async registerInitial(req: Request<{}, {}, Omit<Member, 'member_id' | 'status' | 'role' | 'total_hours' | 'password_hash' | 'last_login'>>, res: Response): Promise<void> {
        try {
            const { first_name, last_name, email } = req.body;

            const memberExists = await db.query<Member>(
                'SELECT * FROM members WHERE email = $1',
                [email],
                { singleRow: true }
            );
            
            if (memberExists?.rowCount && memberExists.rowCount > 0) {
                res.status(400).json({ message: 'Member with this email already exists' });
                return;
            }

            await db.transaction(async (client: PoolClient) => {
                const result = await client.query<Member>(
                    `INSERT INTO members (
                        first_name, last_name, email, status, role
                    ) VALUES ($1, $2, $3, 'pending', 'member')
                    RETURNING member_id, first_name, last_name, email, role`,
                    [first_name, last_name, email]
                );

                const member = result.rows[0];
                res.status(201).json({
                    message: 'Member pre-registered successfully. Awaiting admin password configuration.',
                    member_id: member.member_id,
                    full_name: `${member.first_name} ${member.last_name}`,
                    email: member.email
                });
            });
        } catch (error) {
            console.error('Registration error:', error);
            if (error instanceof DatabaseError) {
                res.status(error.statusCode).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Error registering member' });
            }
        }
    },

    async registerMember(req: Request<{}, {}, Omit<Member, 'member_id' | 'password_hash' | 'total_hours' | 'last_login' | 'full_name'>>, res: Response): Promise<void> {
        try {
            const {
                first_name,
                last_name,
                date_of_birth,
                gender,
                street_address,
                city,
                oib,
                cell_phone,
                email,
                life_status,
                tshirt_size,
                shell_jacket_size
            } = req.body;

            const existingMember = await db.query(
                'SELECT member_id FROM members WHERE oib = $1',
                [oib],
                { singleRow: true }
            );
            
            if (existingMember?.rowCount && existingMember.rowCount > 0) {
                res.status(400).json({
                    message: 'Member with this OIB already exists'
                });
                return;
            }

            const result = await db.query<Member>(
                `INSERT INTO members (
                    first_name, last_name, date_of_birth, gender,
                    street_address, city, oib, cell_phone, 
                    email, life_status, tshirt_size, shell_jacket_size,
                    status, role
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'member')
                RETURNING member_id`,
                [
                    first_name, last_name, date_of_birth, gender,
                    street_address, city, oib, cell_phone,
                    email, life_status, tshirt_size, shell_jacket_size
                ]
            );

            res.status(201).json({
                message: 'Registration successful. Please wait for admin approval.',
                member_id: result.rows[0].member_id
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                message: error instanceof Error ? error.message : 'Registration failed'
            });
        }
    },
	
	async searchMembers(req: Request, res: Response): Promise<void> {
        try {
            const { searchTerm } = req.query;
            if (typeof searchTerm !== 'string' || !searchTerm) {
                res.status(400).json({ message: 'Valid search term is required' });
                return;
            }
            const results = await authRepository.searchMembers(searchTerm);
            res.json(results);
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Error searching members'
            });
        }
    },

    async setMemberPassword(req: Request<{}, {}, SetPasswordRequest>, res: Response): Promise<void> {
        try {
            const { member_id, suffix_numbers } = req.body;

            if (!/^\d{5}$/.test(suffix_numbers)) {
                res.status(400).json({ message: 'Password suffix must be exactly 5 digits' });
                return;
            }

            const member = await authRepository.findUserById(member_id);
            if (!member) {
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            if (member.registration_completed) {
                res.status(400).json({ message: 'Can only set password for pending members' });
                return;
            }

            const password = `${member.first_name} ${member.last_name}-isk-${suffix_numbers}`;
            const hashedPassword = await bcrypt.hash(password, 10);
            await authRepository.updatePassword(member_id, hashedPassword);

            res.json({ 
                message: 'Password set successfully',
                member_id,
                status: 'active'
            });
        } catch (error) {
            console.error('Set password error:', error);
            res.status(500).json({ message: 'Error setting password' });
        }
    },

    async assignPassword(req: Request<{}, {}, { memberId: number; password: string }>, res: Response): Promise<void> {
        try {
            const { memberId, password } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            await authRepository.updatePassword(memberId, hashedPassword);
            res.json({ message: 'Password assigned successfully' });
        } catch (error) {
            console.error('Password assignment error:', error);
            res.status(500).json({ message: 'Failed to assign password' });
        }
    }
};

export default authController;