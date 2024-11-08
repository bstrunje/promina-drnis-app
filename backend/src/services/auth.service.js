// backend/src/services/auth.service.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import authRepository from '../repositories/auth.repository.js';
import db from '../utils/db.js';

const ROLES = {
    MEMBER: 'member',
    ADMIN: 'admin',
    SUPERUSER: 'superuser'
};

const authService = {
    ROLES,

    async register(userData) {
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
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error('Error registering user: ' + error.message);
        } finally {
            client.release();
        }
    },

    async login(credentials) {
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

    validateRole(requiredRole) {
        return (user) => {
            const roleHierarchy = {
                [ROLES.MEMBER]: 1,
                [ROLES.ADMIN]: 2,
                [ROLES.SUPERUSER]: 3
            };

            return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
        };
    }
};

export default authService;