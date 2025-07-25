// controllers/systemManager.controller.ts
import { Request, Response } from 'express';
import systemManagerService from '../services/systemManager.service.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import { JWT_SECRET } from '../config/jwt.config.js';
import jwt from 'jsonwebtoken';
// Using 'any' instead of specific types - temporary solution
// import { SystemManager, SystemManagerLoginData, CreateSystemManagerDto, UpdateMemberPermissionsDto } from '../shared/types/systemManager.js';
import bcrypt from 'bcrypt';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import auditService from '../services/audit.service.js';
import auditRepository from '../repositories/audit.repository.js';
import systemManagerRepository from '../repositories/systemManager.repository.js';
import prisma from '../utils/prisma.js';
import { Prisma, PerformerType } from '@prisma/client';

// Temporary type definition until a full solution is implemented
interface SystemManagerLoginData {
    username: string;
    password: string;
};

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: DatabaseUser;
        }
    }
}

// Change system manager password
export const changePassword = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const managerId = req.user.id; // obtained from JWT after authentication
    const { oldPassword, newPassword } = req.body;

    const manager = await prisma.systemManager.findUnique({ where: { id: managerId } });
    if (!manager) return res.status(404).json({ message: 'System Manager not found' });

    const isMatch = await bcrypt.compare(oldPassword, manager.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.systemManager.update({
        where: { id: managerId },
        data: { password_hash: newHash },
    });

    return res.json({ message: 'Password changed successfully' });
};

// PATCH /system-manager/change-username
export const changeUsername = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const managerId = req.user.id; // obtained from JWT after authentication
    const { username } = req.body;

    // Check if username is already taken
    const existingAdmin = await prisma.systemManager.findUnique({ where: { username } });
    if (existingAdmin && existingAdmin.id !== managerId) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    // Update username
    await prisma.systemManager.update({
        where: { id: managerId },
        data: { username },
    });

    // Log the change in the audit log
    await auditService.logAction(
        'update', // action_type
        managerId,  // performed_by
        `System manager changed username to: ${username}`, // action_details
        req,      // req object
        'success', // status
        undefined,
        PerformerType.SYSTEM_MANAGER
    );

    return res.json({ message: 'Username changed successfully', username });
};

/**
 * Function to refresh System Manager token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get refresh token from cookies
        const refreshToken = req.cookies.systemManagerRefreshToken;
        
        if (!refreshToken) {
            res.status(401).json({ message: 'Refresh token not found' });
            return;
        }
        
        // Verify refresh token
        try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: number; type: string; tokenType: string };
            
            // Check if the token is indeed a refresh token for the System Manager
            if (decoded.type !== 'SystemManager' || decoded.tokenType !== 'refresh') {
                res.status(403).json({ message: 'Invalid token type' });
                return;
            }
            
            // Get manager from the database
            const manager = await systemManagerRepository.findById(decoded.id);
            
            if (!manager) {
                res.status(404).json({ message: 'System Manager not found' });
                return;
            }
            
            // Generate new access token and refresh token
            const token = systemManagerService.generateToken(manager);
            const newRefreshToken = systemManagerService.generateRefreshToken(manager);

            await auditService.logAction(
                'token_refresh',
                manager.id,
                `System manager ${manager.username} has refreshed the token`,
                req,
                'success',
                undefined,
                PerformerType.SYSTEM_MANAGER
            );
            
            // Update last login time
            await systemManagerRepository.updateLastLogin(manager.id);
            
            // Set new refresh token as an HTTP-only cookie
            const isProduction = process.env.NODE_ENV === 'production';
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            // Using let instead of const so we can modify the value
            let secure = isProduction || protocol === 'https';
            
            // Dynamic determination of the sameSite setting
            // For cross-site requests, it's necessary to set sameSite to 'none' and secure to true
            // Firefox specifically requires this combination for a cross-site context
            let sameSite: 'strict' | 'lax' | 'none' | undefined;
            
            if (isProduction || secure) {
                sameSite = 'none';
                // If we use 'none', secure must be true
                if (sameSite === 'none') {
                    secure = true;
                }
            } else {
                sameSite = 'lax'; // For local development
            }
            
            // Delete refreshToken cookie if it exists
            // to avoid conflict between two token types
            if (req.cookies.refreshToken) {
                res.clearCookie('refreshToken', { 
                    path: '/api/auth',
                    secure: secure,
                    sameSite: sameSite
                });
            }
            
            // We also check and delete the old systemManagerRefreshToken if it exists
            if (req.cookies.systemManagerRefreshToken) {
                res.clearCookie('systemManagerRefreshToken', { 
                    path: '/api/system-manager',
                    secure: secure,
                    sameSite: sameSite
                });
            }
            
            res.cookie('systemManagerRefreshToken', newRefreshToken, {
                httpOnly: true,
                secure: secure,
                sameSite: sameSite,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/api/system-manager' // Restricted to the /api/system-manager path
            });
            
            // Return new token
            res.json({
                token,
                manager: {
                    id: manager.id,
                    username: manager.username,
                    email: manager.email,
                    display_name: manager.display_name,
                    role: 'SystemManager',
                    last_login: manager.last_login
                }
            });
        } catch (error) {
            // If the token has expired or is invalid
            res.status(403).json({ message: 'Invalid or expired refresh token' });
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const systemManagerController = {
    // System manager login
    async login(
        req: Request<{}, {}, SystemManagerLoginData>,
        res: Response
    ): Promise<void> {
        try {
            const { username, password } = req.body;

            // Input data validation
            if (!username || !password) {
                res.status(400).json({ message: 'Username and password are required' });
                return;
            }

            // User authentication
            const manager = await systemManagerService.authenticate(username, password);
            
            if (!manager) {
                res.status(401).json({ message: 'Invalid username or password' });
                return;
            }

            // Generate JWT token and refresh token
            const token = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'access' }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

            await auditService.logAction(
                'login', // action_type
                manager.id, // performed_by
                `System manager ${username} has logged into the system`, // action_details
                req,      // req object
                'success', // status
                undefined, // affected_member
                PerformerType.SYSTEM_MANAGER
            );

            // Set new refresh token as an HTTP-only cookie
            const isProduction = process.env.NODE_ENV === 'production';
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            // Using let instead of const so we can modify the value
            let secure = isProduction || protocol === 'https';
            
            // Dynamic determination of the sameSite setting
            // For cross-site requests, it's necessary to set sameSite to 'none' and secure to true
            // Firefox specifically requires this combination for a cross-site context
            let sameSite: 'strict' | 'lax' | 'none' | undefined;
            
            if (isProduction || secure) {
                sameSite = 'none';
                // Ako koristimo 'none', secure mora biti true
                if (sameSite === 'none') {
                    secure = true;
                }
            } else {
                sameSite = 'lax'; // Za lokalni razvoj
            }
            
            // Brisanje refreshToken kolačića ako postoji
            // kako bi se izbjegao konflikt između dva tipa tokena
            if (req.cookies.refreshToken) {
                res.clearCookie('refreshToken', { 
                    path: '/api/auth',
                    secure: secure,
                    sameSite: sameSite
                });
            }
            
            // Također provjeravamo i brišemo stari systemManagerRefreshToken ako postoji
            if (req.cookies.systemManagerRefreshToken) {
                res.clearCookie('systemManagerRefreshToken', { 
                    path: '/api/system-manager',
                    secure: secure,
                    sameSite: sameSite
                });
            }
            
            res.cookie('systemManagerRefreshToken', refreshToken, {
                httpOnly: true,
                secure: secure,
                sameSite: sameSite,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dana
                path: '/api/system-manager' // Ograničeno na /api/system-manager putanju
            });

            // Vrati token i osnovne podatke o manageru
            res.json({
                token,
                manager: {
                    id: manager.id,
                    username: manager.username,
                    email: manager.email,
                    display_name: manager.display_name,
                    role: 'SystemManager',
                    last_login: manager.last_login
                }
            });
        } catch (error) {
            console.error('Error during system manager login:', error);
            res.status(500).json({ message: 'Error occurred during login' });
        }
    },

    // Kreiranje novog system managera (može napraviti samo postojeći system manager)
    async createSystemManager(
        req: Request<{}, {}, any>,
        res: Response
    ): Promise<void> {
        try {
            const { username, password, email, display_name } = req.body;

            // Validacija ulaznih podataka
            if (!username || !password) {
                res.status(400).json({ message: 'Potrebno je unijeti korisničko ime i lozinku' });
                return;
            }

            // Provjera postoji li već korisnik s tim korisničkim imenom
            const existingAdmin = await systemManagerRepository.findByUsername(username);
            if (existingAdmin) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }

            // Kreiranje novog system managera
            const newAdmin = await systemManagerService.createSystemManager({
                username,
                password,
                email,
                display_name
            });

            // Zabilježi kreiranje u audit log
            if (req.user) {
                await auditService.logAction(
                    'create', // action_type
                    req.user.id, // performed_by
                    `Created new system manager: ${username}`, // action_details
                    req, // req objekt
                    'success', // status
                    undefined,
                    req.user.performer_type
                );
            }

            // Vrati osnovne podatke o novom korisniku (bez lozinke)
            res.status(201).json({
                id: newAdmin.id,
                username: newAdmin.username,
                email: newAdmin.email,
                display_name: newAdmin.display_name,
                created_at: newAdmin.created_at
            });
        } catch (error) {
            console.error('Error creating system manager:', error);
            res.status(500).json({ message: 'Error occurred while creating system manager' });
        }
    },

    // Provjera postoji li već system manager u sustavu
    async checkSystemManagerExists(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const exists = await systemManagerService.systemManagerExists();
            res.json({ exists });
        } catch (error) {
            console.error('Error checking if system manager exists:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom provjere postojanja system managera' });
        }
    },

    // Dohvat svih system managera
    async getAllSystemManagers(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const managers = await systemManagerService.getAllSystemManagers();
            
            // Vrati listu system managera bez osjetljivih podataka
            res.json(managers.map(manager => ({
                id: manager.id,
                username: manager.username,
                email: manager.email,
                display_name: manager.display_name,
                last_login: manager.last_login,
                created_at: manager.created_at
            })));
        } catch (error) {
            console.error('Error fetching system managers:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata system managera' });
        }
    },

    // Dohvat ovlasti za konkretnog člana
    async getMemberPermissions(
        req: Request<{ memberId: string }>,
        res: Response
    ): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Neispravan ID člana' });
                return;
            }
            
            const permissions = await systemManagerService.getMemberPermissions(memberId);
            
            if (!permissions) {
                res.status(404).json({ message: 'Član nije pronađen ili nema dodijeljene ovlasti' });
                return;
            }
            
            res.json(permissions);
        } catch (error) {
            console.error('Error fetching member permissions:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata ovlasti člana' });
        }
    },

    // Ažuriranje ovlasti za člana
    async updateMemberPermissions(
        req: Request<{}, {}, any>,
        res: Response
    ): Promise<void> {
        try {
            const { memberId, permissions } = req.body;
            
            if (!memberId || !permissions) {
                res.status(400).json({ message: 'Potrebno je unijeti ID člana i ovlasti' });
                return;
            }
            
            // Provjera postoji li član
            const member = await prisma.member.findUnique({
                where: { member_id: memberId }
            });
            
            if (!member) {
                res.status(404).json({ message: 'Član nije pronađen' });
                return;
            }
            
            // Ažuriranje ovlasti
            await systemManagerService.updateMemberPermissions(
                memberId,
                permissions,
                req.user?.id || 0
            );
            
            // Zabilježi promjenu u audit log
            if (req.user) {
                const permissionsArray = Object.entries(permissions)
                    .filter(([_, value]) => value === true)
                    .map(([key, _]) => key);
                
                await auditService.logAction(
                    'update', // action_type
                    req.user.id, // performed_by
                    `Ažurirane ovlasti za člana (ID: ${memberId}): ${permissionsArray.join(', ')}`, // action_details
                    req, // req objekt
                    'success', // status
                    memberId // affected_member
                );
            }
            
            res.json({ 
                message: 'Ovlasti uspješno ažurirane',
                memberId,
                permissions
            });
        } catch (error) {
            console.error('Error updating member permissions:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom ažuriranja ovlasti člana' });
        }
    },

    // Dohvat svih članova s manager ovlastima
    async getMembersWithPermissions(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const members = await systemManagerService.getMembersWithPermissions();
            res.json(members);
        } catch (error) {
            console.error('Error fetching members with permissions:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata članova s ovlastima' });
        }
    },

    // Dohvat svih članova koji nemaju administratorske ovlasti
    async getMembersWithoutPermissions(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const members = await systemManagerService.getMembersWithoutPermissions();
            res.json(members);
        } catch (error) {
            console.error('Error fetching members without permissions:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata članova bez ovlasti' });
        }
    },

    // Uklanjanje svih ovlasti za člana
    async removeMemberPermissions(
        req: Request<{ memberId: string }>,
        res: Response
    ): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Neispravan ID člana' });
                return;
            }
            
            // Provjera postoji li član
            const member = await prisma.member.findUnique({
                where: { member_id: memberId }
            });
            
            if (!member) {
                res.status(404).json({ message: 'Član nije pronađen' });
                return;
            }
            
            // Provjera ima li član ovlasti
            const permissions = await prisma.memberPermissions.findUnique({
                where: { member_id: memberId }
            });
            
            if (!permissions) {
                res.status(404).json({ message: 'Član nema dodijeljene ovlasti' });
                return;
            }
            
            // Uklanjanje ovlasti
            await systemManagerService.removeMemberPermissions(memberId);
            
            // Zabilježi promjenu u audit log
            if (req.user) {
                await auditService.logAction(
                    'delete', // action_type
                    req.user.id, // performed_by
                    `Uklonjene sve ovlasti za člana (ID: ${memberId})`, // action_details
                    req, // req objekt
                    'success', // status
                    memberId // affected_member
                );
            }
            
            res.json({ 
                message: 'Ovlasti uspješno uklonjene',
                memberId
            });
        } catch (error) {
            console.error('Error removing member permissions:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom uklanjanja ovlasti člana' });
        }
    },

    // Dohvat statistika za system manager dashboard
    async getDashboardStats(
        req: Request,
        res: Response
    ): Promise<any> { 
        try {
            const totalMembers = await prisma.member.count();
            const registeredMembers = await prisma.member.count({ where: { status: 'registered' } });
            const activeMembers = await prisma.member.count({ where: { status: 'active' } }); 
            const pendingApprovals = await prisma.member.count({ where: { registration_completed: false } });

            // TODO: Implementirati dohvat ostalih statistika
            const stats = {
                totalMembers,
                registeredMembers,
                activeMembers,
                pendingApprovals,
                recentActivities: 0, // Placeholder
                systemHealth: 'Healthy', // Placeholder
                lastBackup: 'Never', // Placeholder
            };

            return res.json(stats);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return res.status(500).json({ message: 'Error fetching dashboard stats' });
        }
    },

    // Dohvat sistemskih postavki
    async getSystemSettings(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const settings = await systemManagerService.getSystemSettings();
            res.json(settings);
        } catch (error) {
            console.error('Error fetching system settings:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata sistemskih postavki' });
        }
    },

    // Ažuriranje sistemskih postavki
    async updateSystemSettings(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            console.log('--- USER OBJECT IN updateSystemSettings ---', req.user);

            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { id, cardNumberLength, renewalStartMonth, renewalStartDay, timeZone } = req.body;
            
            // Validacija ulaznih podataka
            if (!id) {
                res.status(400).json({ message: 'Potrebno je unijeti ID postavki' });
                return;
            }
            
            // Dodatne validacije
            if (cardNumberLength !== null && cardNumberLength !== undefined) {
                const cardNumLength = parseInt(cardNumberLength);
                if (isNaN(cardNumLength) || cardNumLength < 1 || cardNumLength > 10) {
                    res.status(400).json({ message: 'Duljina broja članske iskaznice mora biti između 1 i 10' });
                    return;
                }
            }
            
            if (renewalStartMonth !== null && renewalStartMonth !== undefined) {
                const month = parseInt(renewalStartMonth);
                if (isNaN(month) || month < 1 || month > 12) {
                    res.status(400).json({ message: 'Mjesec obnove članarine mora biti između 1 i 12' });
                    return;
                }
            }
            
            if (renewalStartDay !== null && renewalStartDay !== undefined) {
                const day = parseInt(renewalStartDay);
                if (isNaN(day) || day < 1 || day > 31) {
                    res.status(400).json({ message: 'Dan obnove članarine mora biti između 1 i 31' });
                    return;
                }
            }
            
            // Validacija vremenske zone
            if (timeZone && !isValidTimeZone(timeZone)) {
                res.status(400).json({ message: 'Neispravna vremenska zona' });
                return;
            }
            
            // Ažuriranje postavki
            const updatedSettings = await systemManagerService.updateSystemSettings({
                id,
                cardNumberLength: cardNumberLength !== undefined ? parseInt(cardNumberLength) : undefined,
                renewalStartMonth: renewalStartMonth !== undefined ? parseInt(renewalStartMonth) : undefined,
                renewalStartDay: renewalStartDay !== undefined ? parseInt(renewalStartDay) : undefined,
                timeZone
            }, req.user.id);
            
            // Zabilježi promjenu u audit log
            if (req.user) {
                const changedSettings = [];
                if (cardNumberLength !== undefined) changedSettings.push(`cardNumberLength: ${cardNumberLength}`);
                if (renewalStartMonth !== undefined) changedSettings.push(`renewalStartMonth: ${renewalStartMonth}`);
                if (renewalStartDay !== undefined) changedSettings.push(`renewalStartDay: ${renewalStartDay}`);
                if (timeZone) changedSettings.push(`timeZone: ${timeZone}`);
                
                await auditService.logAction(
                    'update', // action_type
                    req.user.id, // performed_by
                    `Updated system settings: ${changedSettings.join(', ')}`, // action_details
                    req, // req objekt
                    'success' // status
                );
            }
            
            res.json({
                message: 'Settings updated successfully',
                settings: updatedSettings
            });
        } catch (error) {
            console.error('Error updating system settings:', error);
            res.status(500).json({ message: 'Error occurred while updating system settings' });
        }
    },

    // Dohvat svih revizijskih zapisa (audit logs)
    async getAuditLogs(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const logs = await auditService.getAllLogs();
            res.json(logs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata revizijskih zapisa' });
        }
    },

    // Dohvat svih članova sa statusom 'pending'
    async getPendingMembers(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const pendingMembers = await prisma.member.findMany({
                where: {
                    registration_completed: false
                },
                select: {
                    member_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    cell_phone: true,
                    created_at: true,
                    membership_details: {
                        select: {
                            status: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
            
            res.json(pendingMembers);
        } catch (error) {
            console.error('Error fetching pending members:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata članova na čekanju' });
        }
    },

    // Dodjeljivanje lozinke članu (aktivacija korisničkog računa)
    async assignPasswordToMember(
        req: Request<
            {},
            {},
            { memberId: number; password: string; cardNumber?: string }
        >,
        res: Response
    ): Promise<void> {
        try {
            const { memberId, password, cardNumber } = req.body;
            
            if (!memberId || !password) {
                res.status(400).json({ message: 'Member ID and password are required' });
                return;
            }
            
            // Provjera postoji li član
            const member = await prisma.member.findUnique({
                where: { member_id: memberId }
            });
            
            if (!member) {
                res.status(404).json({ message: 'Član nije pronađen' });
                return;
            }
            
            // Provjera je li član već aktiviran
            if (member.status !== 'pending') {
                res.status(400).json({ message: 'Member is already activated' });
                return;
            }
            
            // Hashiranje lozinke
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Ažuriranje člana
            const updatedMember = await prisma.member.update({
                where: { member_id: memberId },
                data: {
                    password_hash: hashedPassword,
                    status: 'registered',
                }
            });
            
            // Ažuriranje broja kartice u membership_details ako je potrebno
            if (cardNumber) {
                await prisma.membershipDetails.update({
                    where: { member_id: memberId },
                    data: {
                        card_number: cardNumber
                    }
                });
                
                // Provjeri postoji li već CardNumber zapis s ovim brojem kartice
                const existingCardNumber = await prisma.cardNumber.findUnique({
                    where: { card_number: cardNumber }
                });
                
                if (existingCardNumber) {
                    // Ažuriraj postojeći zapis
                    await prisma.cardNumber.update({
                        where: { id: existingCardNumber.id },
                        data: {
                            member_id: memberId,
                            status: 'assigned',
                            assigned_at: new Date()
                        }
                    });
                } else {
                    // Kreiraj novi zapis
                    await prisma.cardNumber.create({
                        data: {
                            card_number: cardNumber,
                            status: 'assigned',
                            member_id: memberId,
                            assigned_at: new Date()
                        }
                    });
                }
            }
            
            // Zabilježi promjenu u audit log
            if (req.user) {
                await auditService.logAction(
                    'update', // action_type
                    req.user.id, // performed_by
                    `Aktiviran korisnički račun za člana (ID: ${memberId})`, // action_details
                    req, // req objekt
                    'success', // status
                    memberId // affected_member
                );
            }
            
            res.json({ 
                message: 'Korisnički račun uspješno aktiviran',
                memberId,
                status: 'registered'
            });
        } catch (error) {
            console.error('Error assigning password to member:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom aktivacije korisničkog računa' });
        }
    },

    // Dohvat profila trenutnog system managera
    async getCurrentSystemManager(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            if (!req.user || !req.user.is_SystemManager) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const manager = await prisma.systemManager.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    display_name: true,
                    last_login: true,
                    created_at: true,
                    updated_at: true
                }
            });

            if (!manager) {
                res.status(404).json({ message: 'System manager not found' });
                return;
            }

            res.json(manager);
        } catch (error) {
            console.error('Error fetching current system manager:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata profila system managera' });
        }
    },

    // Dohvat informacija o zdravlju sustava
    async getSystemHealth(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Implementacija dohvata informacija o zdravlju sustava
            res.json({ message: 'Not implemented yet' });
        } catch (error) {
            console.error('Error fetching system health:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dohvata informacija o zdravlju sustava' });
        }
    },

    // Kreiranje sigurnosne kopije sustava
    async createSystemBackup(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Implementacija kreiranja sigurnosne kopije
            res.json({ message: 'Not implemented yet' });
        } catch (error) {
            console.error('Error creating system backup:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom kreiranja sigurnosne kopije' });
        }
    },

    // Vraćanje sustava iz sigurnosne kopije
    async restoreSystemBackup(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Implementacija vraćanja iz sigurnosne kopije
            res.status(501).json({ message: 'Not implemented yet' });
        } catch (error) {
            console.error('Error restoring system from backup:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom vraćanja sustava iz sigurnosne kopije' });
        }
    },

    // Dodjeljivanje uloge članu (member_superuser)
    async assignRoleToMember(
        req: Request<{}, {}, { memberId: number; role: 'member' | 'member_administrator' | 'member_superuser' }>,
        res: Response
    ): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const { memberId, role } = req.body;
            
            // Provjera postoji li član
            const member = await prisma.member.findUnique({
                where: { member_id: memberId }
            });
            
            if (!member) {
                res.status(404).json({ message: 'Član nije pronađen' });
                return;
            }
            
            // Ažuriranje uloge člana
            await prisma.member.update({
                where: { member_id: memberId },
                data: { role }
            });
            
            // Zabilježi promjenu u audit log
            await auditService.logAction(
                'update',
                req.user.id,
                `System manager dodijelio ulogu ${role} članu ID: ${memberId}`,
                req,
                'success',
                memberId
            );
            
            res.status(200).json({ message: `Uloga ${role} uspješno dodijeljena članu` });
        } catch (error) {
            console.error('Error assigning role to member:', error);
            res.status(500).json({ message: 'Došlo je do greške prilikom dodjeljivanja uloge članu' });
        }
    }
};

// Pomoćna funkcija za validaciju vremenske zone
function isValidTimeZone(timeZone: string): boolean {
    try {
        Intl.DateTimeFormat(undefined, { timeZone });
        return true;
    } catch (error) {
        return false;
    }
}

// Funkcija za odjavu system managera i poništavanje refresh tokena
async function logoutHandler(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.systemManagerRefreshToken;
    
    // Određivanje postavki za kolačiće
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    let secure = isSecure || isProduction;
    let sameSite: 'strict' | 'lax' | 'none' | undefined;
    
    if (isProduction || secure) {
        sameSite = 'none';
        if (sameSite === 'none') {
            secure = true;
        }
    } else {
        sameSite = 'lax';
    }
    
    // Ako nema refresh tokena, samo obriši kolačiće i vrati uspjeh
    if (!refreshToken) {
        // Briši oba tipa kolačića za svaki slučaj
        res.clearCookie('systemManagerRefreshToken', { 
            path: '/api/system-manager',
            secure: secure,
            sameSite: sameSite
        });
        res.clearCookie('refreshToken', { 
            path: '/api/auth',
            secure: secure,
            sameSite: sameSite
        });
        res.status(200).json({ message: 'Uspješna odjava system managera' });
        return;
    }
    
    try {
        // Provjeri postoji li token u bazi i obriši ga
        await prisma.refresh_tokens.deleteMany({
            where: { token: refreshToken }
        });
        
        // Obriši oba tipa kolačića s ispravnim postavkama
        res.clearCookie('systemManagerRefreshToken', { 
            path: '/api/system-manager',
            secure: secure,
            sameSite: sameSite
        });
        res.clearCookie('refreshToken', { 
            path: '/api/auth',
            secure: secure,
            sameSite: sameSite
        });
        
        res.status(200).json({ message: 'Uspješna odjava system managera' });
    } catch (error) {
        console.error('Greška pri odjavi system managera:', error);
        res.status(500).json({ error: 'Došlo je do greške pri odjavi' });
    }
}

export { logoutHandler };

export default systemManagerController;
