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
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const managerId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const manager = await prisma.systemManager.findUnique({ where: { id: managerId } });
    if (!manager || !manager.password_hash) return res.status(404).json({ message: 'System Manager not found' });

    const isMatch = await bcrypt.compare(oldPassword, manager.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.systemManager.update({
        where: { id: managerId },
        data: { password_hash: newHash },
    });

    return res.json({ message: 'Password changed successfully' });
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

    await auditService.logAction('update', managerId, `System manager changed username to: ${username}`, req, 'success', undefined, PerformerType.SYSTEM_MANAGER, req.user?.organization_id);

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

        await auditService.logAction('token_refresh', manager.id, `System manager ${manager.username} has refreshed the token`, req, 'success', undefined, PerformerType.SYSTEM_MANAGER, manager.organization_id);
        
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

            const token = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'access' }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

            await auditService.logAction('login', manager.id, `System manager ${username} has logged into the system`, req, 'success', undefined, PerformerType.SYSTEM_MANAGER, manager.organization_id);

            const isProduction = process.env.NODE_ENV === 'production';
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            let secure = isProduction || protocol === 'https';
            
            const sameSite: 'strict' | 'lax' | 'none' | undefined = isProduction || secure ? 'none' : 'lax';
            if (sameSite === 'none') secure = true;

            res.cookie('systemManagerRefreshToken', refreshToken, {
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

    async getSystemSettings(req: Request, res: Response): Promise<void> {
        try {
            const settings = await systemManagerService.getSystemSettings(req);
            res.json(settings);
        } catch (error) {
            console.error('Error fetching system settings:', error);
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
            const members = await systemManagerService.getAllMembers(organizationId);
            res.json(members);
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
        const settings = await dutyService.getDutySettingsPublic();
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
        
        const settings = await dutyService.updateDutySettings(updateData);
        
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

export { logoutHandler, getDutySettings, updateDutySettings, getSystemSettings, updateSystemSettings };

export default systemManagerController;
