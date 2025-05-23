import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import prisma from '../utils/prisma.js';

// Types
interface JWTPayload {
    id: number;
    full_name?: string;
    type?: 'member' | 'system_admin';
}

export interface DatabaseUser {
    id: number;
    role: string;        
    role_name: string;   
    member_id?: number;
    is_system_admin?: boolean; 
    user_type: 'member' | 'system_admin'; 
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

        // Provjeri tip korisnika - ako je eksplicitno 'system_admin'
        if (decoded.type === 'system_admin') {
            // Dohvati system admina iz baze - koristi system_admin model s malim početnim slovom
            const systemAdmin = await prisma.system_admin.findUnique({
                where: { id: decoded.id }
            });

            if (!systemAdmin) {
                res.status(401).json({ message: 'System administrator not found' });
                return;
            }

            // Postavi system_admin podatke na request objekt
            req.user = {
                id: systemAdmin.id,
                role: 'system_admin',  
                role_name: 'system_admin',
                is_system_admin: true,
                user_type: 'system_admin'
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
                    WHEN m.role = 'admin' THEN 'admin'
                    WHEN m.role = 'superuser' THEN 'superuser'
                    ELSE 'member'
                END as role_name,
                m.status = 'registered' as is_active,
                m.role,
                m.status
             FROM members m
             WHERE m.member_id = $1 AND (m.role = 'superuser' OR m.status = 'registered')`,
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
            is_system_admin: false,
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
            if (req.user.is_system_admin) {
                next();
                return;
            }

            // Superuser također može sve (na razini člana)
            if (req.user.role_name === 'superuser') {
                next();
                return;
            }

            // Za admin, allow both admin and member actions
            if (req.user.role_name === 'admin' && allowedRoles.includes('admin')) {
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
            console.error('Role checking error:', error);
            res.status(500).json({ message: 'Error checking user role' });
        }
    };
};

// Posebni middleware za system admin korisnike
const requireSystemAdmin = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !req.user.is_system_admin) {
            res.status(403).json({ 
                message: 'Access denied. System administrator privileges required.' 
            });
            return;
        }
        next();
    } catch (error) {
        console.error('System admin check error:', error);
        res.status(500).json({ message: 'Error checking system admin status' });
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
        if (req.user?.is_system_admin) {
            next();
            return;
        }
        
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
            if (req.user.is_system_admin || req.user.role_name === 'superuser') {
                next();
                return;
            }
            
            // Za obične članove s admin ovlastima, provjeri konkretnu ovlast
            if (req.user.member_id) {
                const memberPermissions = await prisma.adminPermissions.findUnique({
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

// Role-based middleware shortcuts
const roles = {
    requireAdmin: checkRole(['admin', 'superuser']),
    requireMember: checkRole(['member', 'admin', 'superuser']),
    requireSuperUser,
    requireSystemAdmin
};

// Export middleware
export { authenticateToken as authMiddleware, checkRole, checkPermission, roles, requireSystemAdmin };