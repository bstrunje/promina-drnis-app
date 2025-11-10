import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { defaultAdminPermissions } from '../config/permissions.config.js';

// Types
interface JWTPayload {
    id: number;
    full_name?: string;
    type?: 'member' | 'SystemManager';
    role?: string;
}

import { PerformerType } from '@prisma/client';

// Napomena: JWTPayload je definiran jednom; uklonjeni duplikati.

export interface DatabaseUser {
    id: number;
    role: string;
    role_name: string;
    member_id?: number;
    is_SystemManager?: boolean;
    user_type: 'member' | 'SystemManager';
    performer_type: PerformerType;
}

// Tip proširenja `req.user` je centraliziran u `backend/src/global.d.ts`.

// Main authentication middleware
const authenticateToken = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    const startTime = Date.now();
    console.log(`[AUTH] Početak autentifikacije za ${req.method} ${req.path}`);
    
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
        if (decoded.type === 'SystemManager' && decoded.role === 'SystemManager') {
            const systemManager = await prisma.systemManager.findUnique({ where: { id: decoded.id } });

            if (systemManager) {
                req.user = {
                    id: systemManager.id,
                    role: 'SystemManager',
                    role_name: 'SystemManager',
                    is_SystemManager: true,
                    user_type: 'SystemManager',
                    performer_type: 'SYSTEM_MANAGER' as PerformerType,
                    // Dodano: organization_id za fallback u System Manager rutama
                    organization_id: systemManager.organization_id ?? undefined
                };
                next(); // KLJUČNI ISPRAVAK: Prosljeđivanje zahtjeva dalje
            } else {
                // Ako manager nije pronađen, prekini zahtjev
                res.status(401).json({ message: 'Invalid token: System Manager not found' });
                return; // Ispravak povratnog tipa
            }
        } else {
            // Za članove - postojeća logika
            console.log(`[AUTH] Dohvaćam podatke člana ${decoded.id} iz baze...`);
            const member = await prisma.member.findFirst({
                where: {
                    member_id: decoded.id,
                    OR: [
                        { role: 'member_superuser' },
                        { status: 'registered' }
                    ]
                },
                select: {
                    member_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true,
                    status: true
                }
            });

            if (!member) {
                console.log(`[AUTH] Član ${decoded.id} nije pronađen ili nije aktivan`);
                res.status(401).json({ message: 'Member not found or inactive' });
                return;
            }

            // Mapiranje role_name prema postojećoj logici
            const role_name = member.role === 'member_administrator' ? 'member_administrator' 
                            : member.role === 'member_superuser' ? 'member_superuser' 
                            : 'member';

            // Attach member to request object
            req.user = {
                id: member.member_id,
                role: member.role,
                role_name: role_name,
                member_id: member.member_id,
                is_SystemManager: false,
                user_type: 'member',
                performer_type: 'MEMBER' as PerformerType
            };
            
            const duration = Date.now() - startTime;
            console.log(`[AUTH] Autentifikacija uspješna za člana ${decoded.id} u ${duration}ms`);
            next(); // Poziv za članove ostaje ovdje
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Token is not valid' });
        return;
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
            res.status(401).json({ 
                message: 'Authentication required. System manager privileges required.' 
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

            
            // Za obične članove i administratore, provjeri konkretnu ovlast
            if (req.user.member_id) {
                const memberPermissions = await prisma.memberPermissions.findUnique({
                    where: { member_id: req.user.member_id }
                });

                // 1. Provjeri specifične ovlasti korisnika iz baze
                if (memberPermissions && memberPermissions[permission as keyof typeof memberPermissions] === true) {
                    return next();
                }

                // 2. Ako nema specifične ovlasti, a korisnik je administrator, provjeri zadane ovlasti
                if (req.user.role_name === 'member_administrator') {
                    if (defaultAdminPermissions[permission as keyof typeof defaultAdminPermissions]) {
                        return next();
                    }
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

// Middleware koji provjerava da li je korisnik superuser, administrator ili organizator aktivnosti
// Obični članovi ne mogu uređivati DEŽURSTVO aktivnosti čak ni ako su organizatori
export const canEditActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activityId } = req.params;
        const user = req.user;

        if (!user || !user.member_id) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        // Superuser i Administrator mogu uvijek uređivati
        if (user.role === 'member_superuser' || user.role === 'member_administrator') {
            return next();
        }

        // Dohvati aktivnost s tipom
        const activity = await prisma.activity.findUnique({
            where: { activity_id: parseInt(activityId, 10) },
            select: { 
                organizer_id: true,
                activity_type: {
                    select: {
                        key: true
                    }
                }
            },
        });

        if (!activity) {
            return res.status(404).json({ message: 'Activity not found.' });
        }

        // Provjeri je li korisnik organizator
        if (activity.organizer_id === user.member_id) {
            // Obični član ne može uređivati DEŽURSTVO aktivnosti
            if (user.role === 'member' && activity.activity_type?.key === 'dezurstva') {
                return res.status(403).json({ 
                    message: 'Access denied. Regular members cannot edit duty activities.' 
                });
            }
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