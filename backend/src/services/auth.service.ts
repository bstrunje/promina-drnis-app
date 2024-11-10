// backend/src/services/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import authRepository from '../repositories/auth.repository';
import db from '../utils/db';
import { User } from '../types/user';

interface UserRegistrationData {
    username: string;
    email: string;
    password: string;
    role?: string;
    // Add any other fields that might be in userData
}

interface UserCredentials {
    username: string;
    password: string;
}

const ROLES = {
    MEMBER: 'member',
    ADMIN: 'admin',
    SUPERUSER: 'superuser'
};

const authService = {
    ROLES,

    async register(userData: UserRegistrationData) {
        // Validate role if provided
        if (userData.role && !Object.values(ROLES).includes(userData.role)) {
            throw new Error('Invalid role specified');
        }

        // Check if user exists
        const existingUser = await authRepository.findUserByEmailOrUsername(
            userData.email,
            userData.username
        );

        if (existingUser) {
            throw new Error('Username or email already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Begin transaction
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            await authRepository.createUserWithMember(
                {
                    ...userData,
                    hashedPassword,
                    role: userData.role || ROLES.MEMBER
                },
                client
            );

            await client.query('COMMIT');
            return { message: 'User registered successfully' };
        } catch (error: any) {
            await client.query('ROLLBACK');
            throw new Error('Error registering user: ' + error.message);
        } finally {
            client.release();
        }
    },

    async login(credentials: UserCredentials) {
        const user = await authRepository.findUserByUsername(credentials.username);

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const validPassword = await bcrypt.compare(credentials.password, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await authRepository.updateLastLogin(user.user_id);

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

        return {
            token,
            user: {
                userId: user.user_id,
                memberId: user.member_id,
                username: user.username,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name
            }
        };
    },

    validateRole(requiredRole: keyof typeof ROLES) {
        return (user: User) => {
            const roleHierarchy: Record<keyof typeof ROLES, number> = {
                MEMBER: 1,
                ADMIN: 2,
                SUPERUSER: 3
            };
    
            if (user.role in roleHierarchy) {
                return roleHierarchy[user.role as keyof typeof ROLES] >= roleHierarchy[requiredRole];
            } else {
                throw new Error('Invalid user role');
            }
        };
    }
};

export default authService;