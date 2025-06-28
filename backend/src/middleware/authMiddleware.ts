import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import prisma from '../utils/prisma.js';

// Types
interface JWTPayload {
    id: number;
    full_name?: string;
    type?: 'member' | 'SystemManager';
}

export interface DatabaseUser {
    id: number;
    role: string;        
    role_name: string;   
    member_id?: number;
    is_SystemManager?: boolean; 
    user_type: 'member' | 'SystemManager'; 
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

        // Provjeri tip korisnika - ako je eksplicitno 'SystemManager'
        if (decoded.type === 'SystemManager') {
            // Dohvati system managera iz ispravne tablice
            const systemManager = await prisma.systemManager.findUnique({
                where: { id: decoded.id }
            });

            if (!systemManager) {
                res.status(401).json({ message: 'System manager not found' });
                return;
            }

            // Postavi SystemManager podatke na request objekt
            req.user = {
                id: systemManager.id,
                role: 'SystemManager',  
                role_name: 'SystemManager', 
                is_SystemManager: true,
                user_type: 'SystemManager'
            };
            next();
            return;
        }

        // Za članove - postojeća logika
        // Get member from database
        const result = await db.query<DatabaseUser>(
            `SELECT 
                m.member_id as id, 
                m.member_id as user_id,
                m.first_name || ' ' || m.last_name as full_name,
                m.email,
                CASE 
                    WHEN m.role = 'member_administrator' THEN 'member_administrator'
                    WHEN m.role = 'member_superuser' THEN 'member_superuser'
                    ELSE 'member'
                END as role_name,
                m.status = 'registered' as is_active,
                m.role,
                m.status
             FROM members m
             WHERE m.member_id = $1 AND (m.role = 'member_superuser' OR m.status = 'registered')`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ message: 'Member not found or inactive' });
            return;
        }

        // Attach member to request object
        req.user = {
            id: result.rows[0].id,
            role: result.rows[0].role,  
            role_name: result.rows[0].role_name,
            member_id: result.rows[0].id,
            is_SystemManager: false,
            user_type: 'member'
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

            // System admin ima sve ovlasti
            if (req.user.is_SystemManager) {
                next();
                return;
            }

            // Superuser također može sve (na razini člana)
            if (req.user.role_name === 'member_superuser') {
                next();
                return;
            }

            // Za admin, allow both admin and member actions
            if (req.user.role_name === 'member_administrator' && allowedRoles.includes('member_administrator')) {
                next();
                return;
            }

            // Za regular member, only allow member actions
            if (allowedRoles.includes(req.user.role_name)) {
                next();
                return;
            }

            res.status(403).json({ 
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
            });
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
};

// Posebni middleware za system manager korisnike
const requireSystemManager = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !req.user.is_SystemManager) {
            res.status(403).json({ 
                message: 'Access denied. System manager privileges required.' 
            });
            return;
        }
        next();
    } catch (error) {
        console.error('System manager check error:', error);
        res.status(500).json({ message: 'Error checking system manager status' });
    }
};

// Super user check middleware
const requireSuperUser = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        // I system admin i superuser mogu pristupiti
        if (req.user?.is_SystemManager) {
            next();
            return;
        }
        
        if (!req.user || req.user.role_name !== 'member_superuser') {
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

// Nova metoda za provjeru specifičnih ovlasti - za granularnu kontrolu
const checkPermission = (permission: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Ako korisnik nije autentificiran
            if (!req.user) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }
            
            // System admin i superuser imaju sve ovlasti
            if (req.user.is_SystemManager || req.user.role_name === 'member_superuser') {
                next();
                return;
            }
            
            // Za obične članove s admin ovlastima, provjeri konkretnu ovlast
            if (req.user.member_id) {
                const memberPermissions = await prisma.memberPermissions.findUnique({
                    where: { member_id: req.user.member_id }
                });
                
                // Ako član nema nikakve ovlasti
                if (!memberPermissions) {
                    res.status(403).json({ 
                        message: `Access denied. Required permission: ${permission}`
                    });
                    return;
                }
                
                // Provjera ima li član specificiranu ovlast
                if (memberPermissions[permission as keyof typeof memberPermissions] === true) {
                    next();
                    return;
                }
            }
            
            res.status(403).json({ 
                message: `Access denied. Required permission: ${permission}`
            });
        } catch (error) {
            console.error('Permission checking error:', error);
            res.status(500).json({ message: 'Error checking user permission' });
        }
    };
};

// Middleware koji provjerava da li je korisnik superuser ili organizator aktivnosti
export const canEditActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activityId } = req.params;
        const user = req.user;

        if (!user || !user.member_id) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        // Superuser can always edit
        if (user.role === 'member_superuser') {
            return next();
        }

        // Check if the user is the organizer of the activity
        const activity = await prisma.activity.findUnique({
            where: { activity_id: parseInt(activityId, 10) },
            select: { organizer_id: true },
        });

        if (!activity) {
            return res.status(404).json({ message: 'Activity not found.' });
        }

        if (activity.organizer_id === user.member_id) {
            return next();
        }

        return res.status(403).json({ message: 'Access denied. You are not the organizer of this activity.' });
    } catch (error) {
        console.error('canEditActivity middleware error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Role-based middleware shortcuts
const roles = {
    requireAdmin: checkRole(['member_administrator']),
    requireMember: checkRole(['member', 'member_administrator', 'member_superuser']),
    requireSuperUser,
    requireSystemManager
};

// Export middleware
export { authenticateToken as authMiddleware, checkRole, checkPermission, roles, requireSystemManager };