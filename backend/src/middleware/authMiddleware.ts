import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';

// Types
interface JWTPayload {
    id: number;
    username: string;
}

export interface DatabaseUser {
    id: number;
    user_id: number;
    username: string;
    email: string;
    role_name: string;
    is_active: boolean;
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
const authMiddleware = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        // Get token from header
        const token = req.header('x-auth-token') || 
                     req.header('Authorization')?.replace('Bearer ', '');
        
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
        m.first_name || ' ' || m.last_name as username,
        m.email,
        CASE 
            WHEN m.role = 'admin' THEN 'admin'
            WHEN m.role = 'superuser' THEN 'superuser'
            ELSE 'member'
        END as role_name,
        m.status = 'active' as is_active
     FROM members m
     WHERE m.member_id = $1 AND m.status = 'active'`,
    [decoded.id]
);

if (result.rows.length === 0) {
    res.status(401).json({ message: 'Member not found or inactive' });
    return;
}

// Attach member to request object
req.user = result.rows[0];
next();
} catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Token is not valid' });
}
};

// Role checking middleware
const checkRole = (allowedRoles: string[]) => {
    return async (
        req: Request, 
        res: Response, 
        next: NextFunction
    ): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }

            if (!allowedRoles.includes(req.user.role_name)) {
                res.status(403).json({ 
                    message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
                });
                return;
            }

            next();
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

export { authMiddleware, checkRole, requireSuperUser, roles };