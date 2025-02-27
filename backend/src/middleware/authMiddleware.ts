import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';

// Types
interface JWTPayload {
    id: number;
    full_name: string;
}

export interface DatabaseUser {
    id: number;
    role: string;        // Dodano
    role_name: string;   // Postojeće
    member_id?: number;
}

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: DatabaseUser;
        }
    }
}

// Main authentication middleware
const authenticateToken = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        // Get token from header
        console.log('Auth headers:', req.headers.authorization);
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            res.status(401).json({ message: 'No token, authorization denied' });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

        // Get member from database
        const result = await db.query<DatabaseUser>(
            `SELECT 
                m.member_id as id, 
                m.member_id as user_id,
                m.first_name || ' ' || m.last_name as full_name,
                m.email,
                CASE 
                    WHEN m.role = 'admin' THEN 'admin'
                    WHEN m.role = 'superuser' THEN 'superuser'
                    ELSE 'member'
                END as role_name,
                m.status = 'registered' as is_active
             FROM members m
             WHERE m.member_id = $1 AND m.status = 'registered'`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ message: 'Member not found or inactive' });
            return;
        }

        // Attach member to request object
        req.user = {
            id: decoded.id,
            role: result.rows[0].role_name,  // dodaj ovo
            role_name: result.rows[0].role_name,  // već imamo role_name iz querya
            member_id: decoded.id
        };
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Role checking middleware
const checkRole = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }

            // Superuser can do everything
            if (req.user.role_name === 'superuser') {
                next();
                return;
            }

            // For admin, allow both admin and member actions
            if (req.user.role_name === 'admin' && allowedRoles.includes('admin')) {
                next();
                return;
            }

            // For regular member, only allow member actions
            if (allowedRoles.includes(req.user.role_name)) {
                next();
                return;
            }

            res.status(403).json({ 
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
            });
        } catch (error) {
            console.error('Role checking error:', error);
            res.status(500).json({ message: 'Error checking user role' });
        }
    };
};

// Super user check middleware
const requireSuperUser = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || req.user.role_name !== 'superuser') {
            res.status(403).json({ 
                message: 'Access denied. Super user privileges required.' 
            });
            return;
        }
        next();
    } catch (error) {
        console.error('Super user check error:', error);
        res.status(500).json({ message: 'Error checking super user status' });
    }
};

// Role-based middleware shortcuts
const roles = {
    requireAdmin: checkRole(['admin', 'superuser']),
    requireMember: checkRole(['member', 'admin', 'superuser']),
    requireSuperUser: requireSuperUser
};

export { 
    authenticateToken as authMiddleware,  // Izvozimo kao authMiddleware
    checkRole, 
    requireSuperUser, 
    roles 
};