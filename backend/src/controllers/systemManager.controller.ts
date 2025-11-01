// ========== KONAČNA ISPRAVLJENA VERZIJA: backend/src/controllers/systemManager.controller.ts ==========

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import systemManagerService from '../services/systemManager.service.js';
import auditService from '../services/audit.service.js';
import cardNumberRepository from '../repositories/cardnumber.repository.js';
import * as dutyService from '../services/duty.service.js';
import prisma from '../utils/prisma.js';
import systemManagerRepository from '../repositories/systemManager.repository.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { PerformerType } from '@prisma/client';
import { generateDeviceHash, isTrustedDevice, addTrustedDevice } from '../utils/systemManagerTrustedDevices.js';

// Koristimo type assertion umjesto interface-a zbog kompatibilnosti s postojećim tipovima

const JWT_SECRET = process.env.JWT_SECRET || '';

interface SystemManagerLoginData {
    username: string;
    password: string;
}

interface CreateSystemManagerBody {
    username: string;
    password: string;
    email?: string;
    display_name?: string;
}

interface UpdateMemberPermissionsBody {
    memberId: number;
    permissions: Record<string, boolean>;
}

export const changePassword = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const managerId = req.user.id;
        const { oldPassword, currentPassword, newPassword } = req.body;
        
        // Prihvaćamo i oldPassword i currentPassword (frontend šalje currentPassword)
        const actualOldPassword = oldPassword || currentPassword;

        // Validacija input parametara
        if (!actualOldPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (typeof actualOldPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ message: 'Passwords must be strings' });
        }

        const manager = await prisma.systemManager.findUnique({ where: { id: managerId } });
        if (!manager || !manager.password_hash) {
            return res.status(404).json({ message: 'System Manager not found' });
        }

        const isMatch = await bcrypt.compare(actualOldPassword, manager.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect old password' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await prisma.systemManager.update({
            where: { id: managerId },
            data: { password_hash: newHash },
        });

        return res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const changeUsername = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const managerId = req.user.id;
    const { newUsername: username } = req.body;
    const organizationId = req.user.organization_id;

    if (organizationId === undefined) {
        return res.status(400).json({ message: 'Organization ID not found for this user.' });
    }

    if (!username) {
        return res.status(400).json({ message: 'New username is required' });
    }

    const existingAdmin = await prisma.systemManager.findUnique({ 
      where: { 
        organization_id_username: {
          organization_id: organizationId,
          username: username
        }
      }
    });
    if (existingAdmin && existingAdmin.id !== managerId) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    await prisma.systemManager.update({
        where: { id: managerId },
        data: { username },
    });

    await auditService.logAction('update', managerId, `Changed username to: ${username}`, req, 'success', undefined, PerformerType.SYSTEM_MANAGER, req.user?.organization_id);

    return res.json({ message: 'Username changed successfully', username });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies.systemManagerRefreshToken;
        if (!refreshToken) {
            res.status(401).json({ message: 'Refresh token not found' });
            return;
        }
        
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: number; type: string; tokenType: string };
        
        if (decoded.type !== 'SystemManager' || decoded.tokenType !== 'refresh') {
            res.status(403).json({ message: 'Invalid token type' });
            return;
        }
        
        const manager = await systemManagerRepository.findById(decoded.id);
        if (!manager) {
            res.status(404).json({ message: 'System Manager not found' });
            return;
        }
        
        const token = systemManagerService.generateToken(manager);
        const newRefreshToken = systemManagerService.generateRefreshToken(manager);

        await auditService.logAction('token_refresh', manager.id, `${manager.display_name || manager.username} has refreshed the token`, req, 'success', undefined, PerformerType.SYSTEM_MANAGER, manager.organization_id);
        
        await systemManagerRepository.updateLastLogin(manager.id);
        
        const isProduction = process.env.NODE_ENV === 'production';
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        let secure = isProduction || protocol === 'https';
        
        const sameSite: 'strict' | 'lax' | 'none' | undefined = isProduction || secure ? 'none' : 'lax';
        if (sameSite === 'none') secure = true;
        
        if (req.cookies.refreshToken) {
            res.clearCookie('refreshToken', { path: '/api/auth', secure: secure, sameSite: sameSite });
        }
        
        if (req.cookies.systemManagerRefreshToken) {
            res.clearCookie('systemManagerRefreshToken', { path: '/api/system-manager', secure: secure, sameSite: sameSite });
        }
        
        res.cookie('systemManagerRefreshToken', newRefreshToken, {
            httpOnly: true,
            secure: secure,
            sameSite: sameSite,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/system-manager'
        });
        
        res.json({
            token,
            manager: {
                id: manager.id,
                username: manager.username,
                email: manager.email,
                display_name: manager.display_name,
                role: 'SystemManager',
                organization_id: manager.organization_id, // null = Global Manager
                is_global: manager.organization_id === null,
                last_login: manager.last_login
            }
        });
    } catch (_error) {
        res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};

const systemManagerController = {
    async login(req: Request<Record<string, never>, Record<string, never>, SystemManagerLoginData>, res: Response): Promise<void> {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                res.status(400).json({ message: 'Username and password are required' });
                return;
            }

            const manager = await systemManagerService.authenticate(req, username, password);

            if (!manager) {
                res.status(401).json({ message: 'Invalid username or password' });
                return;
            }

            // Provjera trusted device i 2FA
            const userAgent = req.headers['user-agent'] || '';
            const ipAddress = req.ip || req.connection.remoteAddress || '';
            const deviceHash = generateDeviceHash(userAgent, ipAddress);
            
            const isDeviceTrusted = await isTrustedDevice(manager.id, deviceHash);
            
            // Ako je 2FA uključen i uređaj nije trusted
            if (manager.two_factor_enabled && !isDeviceTrusted) {
                const tempToken = jwt.sign({ id: manager.id, scope: '2fa', deviceHash }, JWT_SECRET, { expiresIn: '5m' });
                res.status(200).json({ twoFactorRequired: true, tempToken });
                return;
            }

            if (manager.password_reset_required) {
                const tempToken = jwt.sign({ id: manager.id, scope: 'password-reset' }, JWT_SECRET, { expiresIn: '15m' });
                res.status(200).json({ resetRequired: true, tempToken });
                return;
            }

            // Normalan login
            const token = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'access' }, JWT_SECRET, { expiresIn: '15m' });
            const _refreshToken = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

            await auditService.logAction('login', manager.id, `${manager.display_name || manager.username} has logged into the system`, req, 'success', undefined, PerformerType.SYSTEM_MANAGER, manager.organization_id);

            const isProduction = process.env.NODE_ENV === 'production';
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            let secure = isProduction || protocol === 'https';
            
            const sameSite: 'strict' | 'lax' | 'none' | undefined = isProduction || secure ? 'none' : 'lax';
            if (sameSite === 'none') secure = true;

            res.cookie('systemManagerRefreshToken', _refreshToken, {
                httpOnly: true,
                secure: secure,
                sameSite: sameSite,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/api/system-manager'
            });

            res.json({ 
                token, 
                manager: { 
                    id: manager.id, 
                    username: manager.username, 
                    email: manager.email, 
                    display_name: manager.display_name, 
                    role: 'SystemManager', 
                    organization_id: manager.organization_id, // null = Global Manager
                    is_global: manager.organization_id === null,
                    last_login: manager.last_login 
                }
            });
        } catch (error) {
            console.error('Error logging in system manager:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async createSystemManager(req: Request<Record<string, never>, Record<string, never>, CreateSystemManagerBody>, res: Response): Promise<void> {
        try {
            const { username, password, email, display_name } = req.body;
            if (!username || !password) {
                res.status(400).json({ message: 'Username and password are required' });
                return;
            }

            const newManager = await systemManagerService.createSystemManager(req, { username, password, email, display_name });
            res.status(201).json(newManager);
        } catch (error) {
            console.error('Error creating system manager:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async systemManagerExists(req: Request, res: Response): Promise<void> {
        try {
            const exists = await systemManagerService.systemManagerExists();
            res.json({ exists });
        } catch (error) {
            console.error('Error checking if system manager exists:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAllSystemManagers(req: Request, res: Response): Promise<void> {
        try {
            const managers = await systemManagerService.getAllSystemManagers();
            res.json(managers);
        } catch (error) {
            console.error('Error fetching system managers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getMemberPermissions(req: Request, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const permissions = await systemManagerService.getMemberPermissions(memberId);
            if (!permissions) {
                res.status(404).json({ message: 'Permissions not found for this member' });
                return;
            }
            res.json(permissions);
        } catch (error) {
            console.error('Error fetching member permissions:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async updateMemberPermissions(req: Request<Record<string, never>, Record<string, never>, UpdateMemberPermissionsBody>, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const { memberId, permissions } = req.body;
            await systemManagerService.updatePermissions(memberId, permissions, req.user.id);
            res.json({ message: 'Permissions updated successfully' });
        } catch (error) {
            console.error('Error updating member permissions:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getMembersWithPermissions(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implementirati dohvat svih članova s ovlastima
            res.json([]);
        } catch (error) {
            console.error('Error fetching members with permissions:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvaćanja članova s ovlastima' });
        }
    },

    async getMembersWithoutPermissions(req: Request, res: Response): Promise<void> {
        try {
            const members = await systemManagerService.getMembersWithoutPermissions();
            res.json(members);
        } catch (error) {
            console.error('Error fetching members without permissions:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async removeMemberPermissions(req: Request, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            await systemManagerService.removeMemberPermissions(memberId);
            res.json({ message: 'Permissions removed successfully' });
        } catch (error) {
            console.error('Error removing member permissions:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },



    async updateSystemSettings(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const updatedSettings = await systemManagerService.updateSystemSettings(req.body, String(req.user.id));
            res.json(updatedSettings);
        } catch (error) {
            console.error('Error updating system settings:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async deleteMember(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }

            const member = await prisma.member.findUnique({ where: { member_id: memberId } });
            if (!member) {
                res.status(404).json({ message: 'Član nije pronađen' });
                return;
            }

            const membershipDetails = await prisma.membershipDetails.findFirst({ where: { member_id: memberId }, select: { card_number: true } });
            if (membershipDetails?.card_number) {
                const cardMeta = await prisma.cardNumber.findFirst({
                    where: { card_number: membershipDetails.card_number },
                    select: { assigned_at: true }
                });

                try {
                    const organizationId = getOrganizationId(req);
                    await cardNumberRepository.markCardNumberConsumed(organizationId, membershipDetails.card_number, memberId, cardMeta?.assigned_at || undefined, new Date());
                } catch (e) {
                    console.error('[CARD-NUMBERS] Neuspjelo označavanje kartice kao potrošene prije brisanja člana:', e);
                }
            }

            await prisma.member.delete({ where: { member_id: memberId } });

            if (req.user) {
                await auditService.logAction('delete', req.user.id, `Obrisan član (ID: ${memberId}, ${member.first_name} ${member.last_name})`, req, 'success', memberId, PerformerType.SYSTEM_MANAGER, req.user?.organization_id);
            }

            res.json({ message: 'Član uspješno obrisan', memberId });
        } catch (error) {
            console.error('Error deleting member (system manager):', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom brisanja člana' });
        }
    },

    async getDashboardStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await systemManagerService.getDashboardStats(req);
            res.json(stats);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAuditLogs(req: Request, res: Response): Promise<void> {
        try {
            const organizationId = req.user?.organization_id; // Može biti null ili undefined za Global Managera
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            const { logs, total } = await auditService.getPaginatedAuditLogs(organizationId, page, limit);
            
            res.status(200).json({
                logs,
                pagination: {
                    page: page,
                    limit: limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getPendingMembers(req: Request, res: Response): Promise<void> {
        try {
            const organizationId = req.user?.organization_id;
            const members = await systemManagerService.getPendingMembers(organizationId);
            res.json(members);
        } catch (error) {
            console.error('Error fetching pending members:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAllMembers(req: Request, res: Response): Promise<void> {
        try {
            const organizationId = req.user?.organization_id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            
            // Validate pagination parameters
            if (page < 1) {
                res.status(400).json({ message: 'Page must be greater than 0' });
                return;
            }
            if (limit < 1 || limit > 100) {
                res.status(400).json({ message: 'Limit must be between 1 and 100' });
                return;
            }
            
            const result = await systemManagerService.getAllMembers(organizationId, page, limit);
            res.json(result);
        } catch (error) {
            console.error('Error fetching all members:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async assignPasswordToMember(req: Request, res: Response): Promise<void> {
        try {
            const { memberId, password, cardNumber } = req.body;
            const organizationId = req.user?.organization_id;
            await systemManagerService.assignPasswordToMember(memberId, password, cardNumber, organizationId);
            res.status(200).json({ message: 'Password assigned successfully' });
        } catch (error) {
            console.error('Error assigning password:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async assignRoleToMember(req: Request, res: Response): Promise<void> {
        try {
            const { memberId, role } = req.body;
            const organizationId = req.user?.organization_id;
            await systemManagerService.assignRoleToMember(memberId, role, organizationId);
            res.status(200).json({ message: 'Role assigned successfully' });
        } catch (error) {
            console.error('Error assigning role:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getCurrentSystemManager(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const manager = await systemManagerRepository.findById(req.user.id);
            if (!manager) {
                res.status(404).json({ message: 'System Manager not found' });
                return;
            }

            // Ukloni osjetljive podatke
            const { password_hash: _password, two_factor_secret: _secret, two_factor_recovery_codes_hash: _codes, ...safeManager } = manager;
            res.json(safeManager);
        } catch (error) {
            console.error('Error fetching current System Manager:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

};

async function logoutHandler(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.systemManagerRefreshToken;
    
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    let secure = isSecure || isProduction;
    const sameSite: 'strict' | 'lax' | 'none' | undefined = isProduction || secure ? 'none' : 'lax';
    if (sameSite === 'none') secure = true;
    
    if (!refreshToken) {
        res.clearCookie('systemManagerRefreshToken', { path: '/api/system-manager', secure: secure, sameSite: sameSite });
        res.clearCookie('refreshToken', { path: '/api/auth', secure: secure, sameSite: sameSite });
        res.status(200).json({ message: 'Uspješna odjava system managera' });
        return;
    }
    
    try {
        await prisma.refresh_tokens.deleteMany({ where: { token: refreshToken } });
        
        res.clearCookie('systemManagerRefreshToken', { path: '/api/system-manager', secure: secure, sameSite: sameSite });
        res.clearCookie('refreshToken', { path: '/api/auth', secure: secure, sameSite: sameSite });
        
        res.status(200).json({ message: 'Uspješna odjava system managera' });
    } catch (error) {
        console.error('Greška pri odjavi system managera:', error);
        res.status(500).json({ error: 'Došlo je do greške pri odjavi' });
    }
}

async function getDutySettings(req: Request, res: Response): Promise<void> {
    try {
        // Dohvati organizationId iz System Manager user-a
        const manager = req.user as { id: number; organization_id: number | null };
        if (!manager || manager.organization_id === null) {
            res.status(400).json({ message: 'Organization context required for this operation' });
            return;
        }
        
        const settings = await dutyService.getDutySettingsPublic(manager.organization_id);
        res.json(settings);
    } catch (error) {
        console.error('Error fetching duty settings:', error);
        res.status(500).json({ message: 'Error occurred while fetching duty settings' });
    }
}

async function updateDutySettings(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        
        // Dohvati organizationId iz System Manager user-a
        const manager = req.user as { id: number; organization_id: number | null };
        if (!manager || manager.organization_id === null) {
            res.status(400).json({ message: 'Organization context required for this operation' });
            return;
        }

        const { dutyCalendarEnabled, dutyMaxParticipants, dutyAutoCreateEnabled } = req.body;
        
        const updateData: { dutyCalendarEnabled?: boolean; dutyMaxParticipants?: number; dutyAutoCreateEnabled?: boolean; } = {};
        
        if (dutyCalendarEnabled !== undefined) updateData.dutyCalendarEnabled = Boolean(dutyCalendarEnabled);
        
        if (dutyMaxParticipants !== undefined) {
            const max = parseInt(dutyMaxParticipants, 10);
            if (isNaN(max) || max < 1 || max > 10) {
                res.status(400).json({ message: 'Max participants must be between 1 and 10' });
                return;
            }
            updateData.dutyMaxParticipants = max;
        }
        
        if (dutyAutoCreateEnabled !== undefined) updateData.dutyAutoCreateEnabled = Boolean(dutyAutoCreateEnabled);
        
        const settings = await dutyService.updateDutySettings(manager.organization_id, updateData);
        
        await auditService.logAction('update', req.user.id, `Updated duty calendar settings: ${JSON.stringify(updateData)}`, req, 'success', undefined, PerformerType.SYSTEM_MANAGER, req.user?.organization_id);
        
        res.json({ message: 'Duty calendar settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating duty settings:', error);
        res.status(500).json({ message: 'Error occurred while updating duty settings' });
    }
}

async function getSystemSettings(req: Request, res: Response): Promise<void> {
  try {
    const settings = await systemManagerService.getSystemSettings(req);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Error occurred while fetching system settings' });
  }
}

async function updateSystemSettings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const updatedSettings = await systemManagerService.updateSystemSettings(req.body, String(req.user.id));
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ message: 'Error occurred while updating system settings' });
  }
}



async function resetOrganizationManagerCredentials(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const organizationId = parseInt(req.params.id, 10);
        if (isNaN(organizationId)) {
            res.status(400).json({ message: 'Invalid Organization ID' });
            return;
        }

        const performerId = req.user.id;
        const performer = await prisma.systemManager.findUnique({ where: { id: performerId } });

        if (!performer) {
            res.status(401).json({ message: 'Performer not found.' });
            return;
        }

        await systemManagerService.resetOrganizationManagerCredentials(organizationId, performer);

        await auditService.logAction(
            'reset_credentials',
            performer.id,
            `Reset credentials for manager of organization ID: ${organizationId}`,
            req,
            'success',
            organizationId,
            PerformerType.SYSTEM_MANAGER
        );

        res.status(200).json({ message: 'Organization Manager credentials reset successfully.' });
    } catch (error) {
        console.error('Error resetting organization manager credentials:', error);
        if (error instanceof Error) {
            if (error.message.includes('Forbidden')) {
                res.status(403).json({ message: error.message });
            } else {
                res.status(500).json({ message: error.message });
            }
        } else {
            res.status(500).json({ message: 'An unknown error occurred.' });
        }
    }
}

async function verify2faAndProceed(req: Request, res: Response): Promise<void> {
    try {
        const { tempToken, _code } = req.body;
        const decoded = jwt.verify(tempToken, JWT_SECRET) as { id: number; scope: string; deviceHash?: string };

        if (decoded.scope !== '2fa') {
            res.status(403).json({ message: 'Invalid token scope' });
            return;
        }

        const manager = await systemManagerRepository.findById(decoded.id);
        if (!manager || !manager.two_factor_secret) {
            res.status(404).json({ message: 'Manager not found or 2FA not enabled' });
            return;
        }

        // Ovdje treba dodati logiku za provjeru 2FA koda (npr. koristeći otplib)
        // const isValid = otplib.totp.check(code, manager.two_factor_secret);
        // if (!isValid) {
        //     res.status(401).json({ message: 'Invalid 2FA code' });
        //     return;
        // }

        if (manager.password_reset_required) {
            const newTempToken = jwt.sign({ id: manager.id, scope: 'password-reset' }, JWT_SECRET, { expiresIn: '15m' });
            res.status(200).json({ resetRequired: true, tempToken: newTempToken });
        } else {
            // Provjeri System Settings za trusted devices
            const systemSettings = await prisma.systemSettings.findFirst({
                where: { organization_id: manager.organization_id },
                select: {
                    twoFactorTrustedDevicesEnabled: true,
                    twoFactorRememberDeviceDays: true
                }
            });

            // Ako je trusted devices omogućeno u System Settings, dodaj uređaj
            if (systemSettings?.twoFactorTrustedDevicesEnabled && decoded.deviceHash) {
                const userAgent = req.headers['user-agent'] || '';
                const deviceName = userAgent.substring(0, 100); // Ograniči na 100 znakova
                const rememberDays = systemSettings.twoFactorRememberDeviceDays || 30;
                try {
                    await addTrustedDevice(manager.id, decoded.deviceHash, deviceName, rememberDays);
                    console.log(`Added trusted device for SystemManager ${manager.id}: ${deviceName}`);
                } catch (error) {
                    console.error('Failed to add trusted device:', error);
                }
            }

            // Normalan login nakon 2FA
            const token = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'access' }, JWT_SECRET, { expiresIn: '15m' });
            const _refreshToken = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
            
            // Postavljanje cookie-a i vraćanje odgovora kao u login funkciji
            res.json({ token, manager: { id: manager.id, username: manager.username, email: manager.email, display_name: manager.display_name, role: 'SystemManager', organization_id: manager.organization_id, is_global: manager.organization_id === null, last_login: manager.last_login } });
        }
    } catch (_error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
}

async function forceChangePassword(req: Request, res: Response): Promise<void> {
    try {
        const { tempToken, newPassword } = req.body;
        const decoded = jwt.verify(tempToken, JWT_SECRET) as { id: number; scope: string };

        if (decoded.scope !== 'password-reset') {
            res.status(403).json({ message: 'Invalid token scope' });
            return;
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await prisma.systemManager.update({
            where: { id: decoded.id },
            data: { password_hash: newHash, password_reset_required: false },
        });

        const manager = await systemManagerRepository.findById(decoded.id);
        if (!manager) {
            res.status(404).json({ message: 'Manager not found' });
            return;
        }

        // Normalan login nakon promjene lozinke
        const token = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'access' }, JWT_SECRET, { expiresIn: '15m' });
        const _refreshToken = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, manager: { id: manager.id, username: manager.username, email: manager.email, display_name: manager.display_name, role: 'SystemManager', organization_id: manager.organization_id, is_global: manager.organization_id === null, last_login: manager.last_login } });
    } catch (_error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
}

// --- PIN 2FA FUNCTIONS FOR SYSTEM MANAGER ---

/**
 * Setup PIN 2FA za System Manager
 */
const setupSystemManager2faPin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { pin } = req.body;
        const managerId = (req as { user?: { id: number } }).user?.id;

        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
            res.status(400).json({ message: 'PIN must be exactly 6 digits' });
            return;
        }

        // Hash PIN
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);

        // Update System Manager
        await systemManagerRepository.update(managerId, {
            two_factor_enabled: true,
            two_factor_secret: hashedPin,
            two_factor_preferred_channel: 'pin',
            two_factor_confirmed_at: new Date()
        });

        res.json({ message: 'PIN 2FA successfully enabled' });
    } catch (error) {
        console.error('Error setting up PIN 2FA:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Verify PIN 2FA za System Manager
 */
const verifySystemManager2faPin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { pin, tempToken } = req.body;

        if (!pin || !tempToken) {
            res.status(400).json({ message: 'PIN and temp token are required' });
            return;
        }

        // Verify temp token
        const decoded = jwt.verify(tempToken, JWT_SECRET) as { id: number; scope: string; deviceHash?: string };
        if (decoded.scope !== '2fa') {
            res.status(403).json({ message: 'Invalid token scope' });
            return;
        }

        // Get manager
        const manager = await systemManagerRepository.findById(decoded.id);
        if (!manager || !manager.two_factor_enabled || !manager.two_factor_secret) {
            res.status(404).json({ message: 'Manager not found or 2FA not enabled' });
            return;
        }

        // Verify PIN
        const isValidPin = await bcrypt.compare(pin, manager.two_factor_secret);
        if (!isValidPin) {
            res.status(401).json({ message: 'Invalid PIN' });
            return;
        }

        // Provjeri System Settings za trusted devices
        const systemSettings = await prisma.systemSettings.findFirst({
            select: {
                twoFactorTrustedDevicesEnabled: true,
                twoFactorRememberDeviceDays: true
            }
        });

        // Ako je trusted devices omogućeno u System Settings, dodaj uređaj
        if (systemSettings?.twoFactorTrustedDevicesEnabled && decoded.deviceHash) {
            const userAgent = req.headers['user-agent'] || '';
            const deviceName = userAgent.substring(0, 100); // Ograniči na 100 znakova
            const rememberDays = systemSettings.twoFactorRememberDeviceDays || 30;
            await addTrustedDevice(manager.id, decoded.deviceHash, deviceName, rememberDays);
        }

        // Generate access token
        const token = jwt.sign({ 
            id: manager.id, 
            role: 'SystemManager', 
            type: 'SystemManager', 
            tokenType: 'access' 
        }, JWT_SECRET, { expiresIn: '15m' });

        const refreshToken = jwt.sign({ 
            id: manager.id, 
            role: 'SystemManager', 
            type: 'SystemManager', 
            tokenType: 'refresh' 
        }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            token, 
            refreshToken,
            manager: { 
                id: manager.id, 
                username: manager.username, 
                email: manager.email, 
                display_name: manager.display_name, 
                role: 'SystemManager', 
                organization_id: manager.organization_id, 
                is_global: manager.organization_id === null, 
                last_login: manager.last_login 
            } 
        });
    } catch (error) {
        console.error('Error verifying PIN 2FA:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Disable 2FA za System Manager
 */
const disableSystemManager2fa = async (req: Request, res: Response): Promise<void> => {
    try {
        const managerId = (req as { user?: { id: number } }).user?.id;

        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Update System Manager
        await systemManagerRepository.update(managerId, {
            two_factor_enabled: false,
            two_factor_secret: null,
            two_factor_preferred_channel: null,
            two_factor_confirmed_at: null
        });

        res.json({ message: '2FA successfully disabled' });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get 2FA status za System Manager
 */
const getSystemManager2faStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const managerId = (req as { user?: { id: number } }).user?.id;

        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const manager = await systemManagerRepository.findById(managerId);
        if (!manager) {
            res.status(404).json({ message: 'Manager not found' });
            return;
        }

        res.json({
            twoFactorEnabled: manager.two_factor_enabled || false,
            preferredChannel: manager.two_factor_preferred_channel,
            confirmedAt: manager.two_factor_confirmed_at
        });
    } catch (error) {
        console.error('Error getting 2FA status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Enable 2FA za specifičnog System Manager (samo Global SM može)
 */
const enableSystemManager2faForUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { systemManagerId, pin } = req.body;
        const currentManagerId = (req as { user?: { id: number } }).user?.id;

        if (!currentManagerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Provjeri je li trenutni manager Global SM
        const currentManager = await systemManagerRepository.findById(currentManagerId);
        if (!currentManager || currentManager.organization_id !== null) {
            res.status(403).json({ message: 'Only Global System Manager can manage 2FA for other managers' });
            return;
        }

        if (!systemManagerId || !pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
            res.status(400).json({ message: 'System Manager ID and 6-digit PIN are required' });
            return;
        }

        // Hash PIN
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);

        // Update System Manager
        await systemManagerRepository.update(systemManagerId, {
            two_factor_enabled: true,
            two_factor_secret: hashedPin,
            two_factor_preferred_channel: 'pin',
            two_factor_confirmed_at: new Date()
        });

        res.json({ message: 'PIN 2FA successfully enabled for System Manager' });
    } catch (error) {
        console.error('Error enabling 2FA for System Manager:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Disable 2FA za specifičnog System Manager (samo Global SM može)
 */
const disableSystemManager2faForUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { systemManagerId } = req.body;
        const currentManagerId = (req as { user?: { id: number } }).user?.id;

        if (!currentManagerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Provjeri je li trenutni manager Global SM
        const currentManager = await systemManagerRepository.findById(currentManagerId);
        if (!currentManager || currentManager.organization_id !== null) {
            res.status(403).json({ message: 'Only Global System Manager can manage 2FA for other managers' });
            return;
        }

        if (!systemManagerId) {
            res.status(400).json({ message: 'System Manager ID is required' });
            return;
        }

        // Update System Manager
        await systemManagerRepository.update(systemManagerId, {
            two_factor_enabled: false,
            two_factor_secret: null,
            two_factor_preferred_channel: null,
            two_factor_confirmed_at: null
        });

        res.json({ message: '2FA successfully disabled for System Manager' });
    } catch (error) {
        console.error('Error disabling 2FA for System Manager:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get trusted devices za System Manager
 */
const getSystemManagerTrustedDevices = async (req: Request, res: Response): Promise<void> => {
    try {
        const managerId = (req as { user?: { id: number } }).user?.id;

        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { getTrustedDevices } = await import('../utils/systemManagerTrustedDevices.js');
        const devices = await getTrustedDevices(managerId);

        res.json(devices);
    } catch (error) {
        console.error('Error getting trusted devices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Remove trusted device za System Manager
 */
const removeSystemManagerTrustedDevice = async (req: Request, res: Response): Promise<void> => {
    try {
        const managerId = (req as { user?: { id: number } }).user?.id;
        const deviceId = parseInt(req.params.deviceId);

        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (isNaN(deviceId)) {
            res.status(400).json({ message: 'Invalid device ID' });
            return;
        }

        // Provjeri pripada li device ovom manageru
        const { getTrustedDevices, removeTrustedDevice } = await import('../utils/systemManagerTrustedDevices.js');
        const devices = await getTrustedDevices(managerId);
        const device = devices.find((d: { id: number; device_hash: string }) => d.id === deviceId);

        if (!device) {
            res.status(404).json({ message: 'Device not found or does not belong to you' });
            return;
        }

        await removeTrustedDevice(managerId, device.device_hash);
        res.json({ message: 'Trusted device removed successfully' });
    } catch (error) {
        console.error('Error removing trusted device:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get trusted devices settings for SystemManager
const getSystemManagerTrustedDevicesSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const managerId = (req as Request & { user?: { id: number } }).user?.id;
        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const manager = await prisma.systemManager.findUnique({
            where: { id: managerId }
        });

        if (!manager) {
            res.status(404).json({ message: 'System Manager not found' });
            return;
        }

        // Za GSM (organization_id = null) koristimo globalne settings
        // Za Org SM koristimo organizacijske settings
        const settings = await prisma.systemSettings.findFirst({
            where: { organization_id: manager.organization_id },
            select: { twoFactorTrustedDevicesEnabled: true }
        });

        res.json({ 
            enabled: settings?.twoFactorTrustedDevicesEnabled ?? false 
        });
    } catch (error) {
        console.error('Error getting trusted devices settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update trusted devices settings for SystemManager
const updateSystemManagerTrustedDevicesSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const managerId = (req as Request & { user?: { id: number } }).user?.id;
        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const manager = await prisma.systemManager.findUnique({
            where: { id: managerId }
        });

        if (!manager) {
            res.status(404).json({ message: 'System Manager not found' });
            return;
        }

        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ message: 'Invalid enabled value' });
            return;
        }

        // Za GSM (organization_id = null) ažuriramo globalne settings
        // Za Org SM ažuriramo organizacijske settings
        if (manager.organization_id === null) {
            // GSM - globalne settings
            const existingSettings = await prisma.systemSettings.findFirst({
                where: { organization_id: null }
            });

            if (existingSettings) {
                await prisma.systemSettings.update({
                    where: { id: existingSettings.id },
                    data: { twoFactorTrustedDevicesEnabled: enabled }
                });
            } else {
                await prisma.systemSettings.create({
                    data: {
                        organization_id: null,
                        twoFactorTrustedDevicesEnabled: enabled
                    }
                });
            }
        } else {
            // Org SM - organizacijske settings
            await prisma.systemSettings.upsert({
                where: { organization_id: manager.organization_id },
                create: {
                    organization_id: manager.organization_id,
                    twoFactorTrustedDevicesEnabled: enabled
                },
                update: {
                    twoFactorTrustedDevicesEnabled: enabled
                }
            });
        }

        res.json({ message: 'Trusted devices settings updated successfully' });
    } catch (error) {
        console.error('Error updating trusted devices settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get organization trusted devices settings
const getOrganizationTrustedDevicesSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('GET organization trusted devices settings called for org:', req.params.organizationId);
        const managerId = (req as Request & { user?: { id: number } }).user?.id;
        const organizationId = parseInt(req.params.organizationId);

        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const manager = await prisma.systemManager.findUnique({
            where: { id: managerId }
        });

        if (!manager) {
            res.status(404).json({ message: 'System Manager not found' });
            return;
        }

        // Samo GSM može upravljati organizacijskim settings
        if (manager.organization_id !== null) {
            res.status(403).json({ message: 'Only Global System Managers can manage organization settings' });
            return;
        }

        const settings = await prisma.systemSettings.findFirst({
            where: { organization_id: organizationId },
            select: { twoFactorTrustedDevicesEnabled: true }
        });

        res.json({ 
            enabled: settings?.twoFactorTrustedDevicesEnabled ?? false 
        });
    } catch (error) {
        console.error('Error getting organization trusted devices settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update organization trusted devices settings
const updateOrganizationTrustedDevicesSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const managerId = (req as Request & { user?: { id: number } }).user?.id;
        const organizationId = parseInt(req.params.organizationId);

        if (!managerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const manager = await prisma.systemManager.findUnique({
            where: { id: managerId }
        });

        if (!manager) {
            res.status(404).json({ message: 'System Manager not found' });
            return;
        }

        // Samo GSM može upravljati organizacijskim settings
        if (manager.organization_id !== null) {
            res.status(403).json({ message: 'Only Global System Managers can manage organization settings' });
            return;
        }

        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ message: 'Invalid enabled value' });
            return;
        }

        await prisma.systemSettings.upsert({
            where: { organization_id: organizationId },
            create: {
                organization_id: organizationId,
                twoFactorTrustedDevicesEnabled: enabled
            },
            update: {
                twoFactorTrustedDevicesEnabled: enabled
            }
        });

        res.json({ message: 'Organization trusted devices settings updated successfully' });
    } catch (error) {
        console.error('Error updating organization trusted devices settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { logoutHandler, getDutySettings, updateDutySettings, getSystemSettings, updateSystemSettings, resetOrganizationManagerCredentials, verify2faAndProceed, forceChangePassword, setupSystemManager2faPin, verifySystemManager2faPin, disableSystemManager2fa, getSystemManager2faStatus, enableSystemManager2faForUser, disableSystemManager2faForUser, getSystemManagerTrustedDevices, removeSystemManagerTrustedDevice, getSystemManagerTrustedDevicesSettings, updateSystemManagerTrustedDevicesSettings, getOrganizationTrustedDevicesSettings, updateOrganizationTrustedDevicesSettings };

export default systemManagerController;
