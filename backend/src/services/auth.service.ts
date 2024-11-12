// backend/src/services/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/config.ts';
import authRepository from '../repositories/auth.repository.ts';
import db from '../utils/db.ts';
import { User, UserRegistrationData } from '../types/user.ts';

const ROLES = {
    MEMBER: 'member',
    ADMIN: 'admin',
    SUPERUSER: 'superuser'
} as const;

type Role = typeof ROLES[keyof typeof ROLES];

interface LoginCredentials {
    username: string;
    password: string;
}

const authService = {
    ROLES,

    async register(userData: Omit<UserRegistrationData, 'hashedPassword' | 'username'>) {
        // Validate role if provided
        if (userData.role && !Object.values(ROLES).includes(userData.role as Role)) {
            throw new Error('Invalid role specified');
        }

        // Generate username
        const username = await authRepository.generateUsername(userData.firstName, userData.lastName);

        // Hash password (initially same as username)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(username, salt);

        // Begin transaction
        return db.transaction(async (client) => {
            const newUser = await authRepository.createUserWithMember(
                {
                    ...userData,
                    username,
                    hashedPassword,
                    role: userData.role || ROLES.MEMBER
                },
                client
            );

            // Set initial password
            await authRepository.setInitialPassword(newUser.user_id, hashedPassword);

            return { message: 'User registered successfully', userId: newUser.user_id, username };
        });
    },

    async login(credentials: LoginCredentials) {
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

    validateRole(requiredRole: Role) {
        return (user: User) => {
            const roleHierarchy: Record<Role, number> = {
                [ROLES.MEMBER]: 1,
                [ROLES.ADMIN]: 2,
                [ROLES.SUPERUSER]: 3
            };

            if (user.role in roleHierarchy) {
                return roleHierarchy[user.role as Role] >= roleHierarchy[requiredRole];
            } else {
                throw new Error('Invalid user role');
            }
        };
    }
};

export default authService;