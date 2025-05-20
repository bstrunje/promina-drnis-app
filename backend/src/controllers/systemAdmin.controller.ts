// controllers/systemAdmin.controller.ts
import { Request, Response } from 'express';
import systemAdminService from '../services/systemAdmin.service.js';
// Koristimo any umjesto specifičnih tipova - privremeno rješenje
// import { SystemAdmin, SystemAdminLoginData, CreateSystemAdminDto, UpdateMemberPermissionsDto } from '../shared/types/systemAdmin.js';
import bcrypt from 'bcrypt';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import auditService from '../services/audit.service.js';
import systemAdminRepository from '../repositories/systemAdmin.repository.js';
import prisma from '../utils/prisma.js';

// Privremena definicija tipova dok se ne implementira potpuno rješenje
type SystemAdminLoginData = {
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

// Promjena lozinke system admina
export const changePassword = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const adminId = req.user.id; // dobiveno iz JWT-a nakon autentikacije
    const { oldPassword, newPassword } = req.body;

    const admin = await prisma.systemAdmin.findUnique({ where: { id: adminId } });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(oldPassword, admin.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Pogrešna stara lozinka' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.systemAdmin.update({
        where: { id: adminId },
        data: { password_hash: newHash },
    });

    return res.json({ message: 'Lozinka uspješno promijenjena' });
};

// PATCH /system-admin/change-username
export const changeUsername = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const adminId = req.user.id;
    const { newUsername } = req.body;
    if (!newUsername || typeof newUsername !== 'string' || newUsername.length < 4) {
        return res.status(400).json({ message: 'Novi username mora imati barem 4 znaka.' });
    }
    // Provjeri je li username već zauzet
    const existing = await prisma.systemAdmin.findUnique({ where: { username: newUsername } });
    if (existing) {
        return res.status(409).json({ message: 'Taj username je već zauzet.' });
    }
    // Promijeni username
    const updated = await prisma.systemAdmin.update({
        where: { id: adminId },
        data: { username: newUsername },
    });
    // Audit log (opcionalno)
    await auditService.logAction && auditService.logAction(
        'CHANGE_USERNAME',
        adminId,
        `Promijenjen username na ${newUsername}`,
        req,
        'success'
    );
    return res.json({ message: 'Username uspješno promijenjen.', username: updated.username });
};

const systemAdminController = {
    // Prijava system admina
    async login(
        req: Request<{}, {}, SystemAdminLoginData>,
        res: Response
    ): Promise<void> {
        try {
            const { username, password } = req.body;
            const userIP = req.ip || req.socket.remoteAddress || 'unknown';

            // Osnovna validacija
            if (!username || !password) {
                console.warn(`System Admin login attempt without credentials from IP ${userIP}`);
                res.status(400).json({ message: "Username and password are required" });
                return;
            }

            // Sanitizacija ulaznih podataka
            const sanitizedUsername = username.trim();

            console.log(`System Admin login attempt for user "${sanitizedUsername}" from IP ${userIP}`);

            // Autentikacija
            const admin = await systemAdminService.authenticate(sanitizedUsername, password);

            if (!admin) {
                console.warn(`Failed System Admin login: user "${sanitizedUsername}" not found or invalid credentials (IP: ${userIP})`);
                res.status(401).json({ message: "Invalid username or password" });
                return;
            }

            // Generiranje JWT tokena
            const token = systemAdminService.generateToken(admin);

            // Bilježenje uspješne prijave
            await auditService.logEvent({
                event_type: 'SYSTEM_ADMIN_LOGIN',
                user_id: admin.id,
                user_type: 'system_admin',
                ip_address: userIP,
                details: {
                    username: sanitizedUsername,
                    admin_id: admin.id
                }
            });

            console.log(`System Admin "${sanitizedUsername}" successfully logged in (IP: ${userIP})`);

            // Vraćamo samo osnovne podatke o administratoru
            res.json({
                admin: {
                    id: admin.id,
                    username: admin.username,
                    display_name: admin.display_name
                },
                token
            });
        } catch (error) {
            console.error('System Admin login error:', error);
            res.status(500).json({ message: "Internal server error during login" });
        }
    },

    // Kreiranje novog system admina (može napraviti samo postojeći system admin)
    async createSystemAdmin(
        req: Request<{}, {}, any>,
        res: Response
    ): Promise<void> {
        try {
            const { username, email, password, display_name } = req.body;
            const userIP = req.ip || req.socket.remoteAddress || 'unknown';

            // Provjera postoji li već system admin s tim korisničkim imenom
            const existingAdmin = await systemAdminRepository.findByUsername(username);
            if (existingAdmin) {
                res.status(400).json({ message: "Username already exists" });
                return;
            }

            // Provjera postoji li već system admin s tim emailom
            const adminWithEmail = await systemAdminRepository.findByEmail(email);
            if (adminWithEmail) {
                res.status(400).json({ message: "Email already in use" });
                return;
            }

            // Kreiranje hash-a lozinke
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Kreiranje novog administratora
            const admin = await systemAdminService.createSystemAdmin({
                username,
                email,
                password_hash: passwordHash,
                display_name
            });

            // Bilježenje kreacije novog admina
            await auditService.logEvent({
                event_type: 'SYSTEM_ADMIN_CREATED',
                user_id: req.user?.id || null,
                user_type: req.user?.user_type || null,
                ip_address: userIP,
                details: {
                    new_admin_id: admin.id,
                    new_admin_username: username,
                    created_by: req.user?.id || 'unknown'
                }
            });

            // Vraćamo podatke bez lozinke
            const { password_hash, ...adminWithoutPassword } = admin;
            res.status(201).json({ admin: adminWithoutPassword });
        } catch (error) {
            console.error('Error creating system admin:', error);
            res.status(500).json({ message: "Internal server error during admin creation" });
        }
    },

    // Provjera postoji li već system admin u sustavu
    async checkSystemAdminExists(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const exists = await systemAdminService.systemAdminExists();
            res.json({ exists });
        } catch (error) {
            console.error('Error checking if system admin exists:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Dohvat svih system admina
    async getAllSystemAdmins(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može vidjeti ostale
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            const admins = await systemAdminService.getAllSystemAdmins();

            // Vraćamo podatke bez hash-a lozinke
            const adminsWithoutPassword = admins.map(admin => {
                const { password_hash, ...adminData } = admin;
                return adminData;
            });

            res.json(adminsWithoutPassword);
        } catch (error) {
            console.error('Error fetching all system admins:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Dohvat ovlasti za konkretnog člana
    async getMemberPermissions(
        req: Request<{ memberId: string }>,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može dohvatiti ovlasti
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            const memberId = parseInt(req.params.memberId);

            if (isNaN(memberId)) {
                res.status(400).json({ message: "Invalid member ID" });
                return;
            }

            const permissions = await systemAdminService.getMemberPermissions(memberId);

            if (!permissions) {
                res.status(404).json({ message: "Member or permissions not found" });
                return;
            }

            res.json(permissions);
        } catch (error) {
            console.error('Error fetching member permissions:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Ažuriranje ovlasti za člana
    async updateMemberPermissions(
        req: Request<{}, {}, any>,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može ažurirati ovlasti
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            const { memberId, permissions } = req.body;

            if (!memberId || !permissions) {
                res.status(400).json({ message: "Member ID and permissions are required" });
                return;
            }

            // Provjera postoji li član
            const memberExists = await prisma.member.findUnique({
                where: { member_id: memberId }
            });

            if (!memberExists) {
                res.status(404).json({ message: "Member not found" });
                return;
            }

            // Ažuriranje ovlasti
            await systemAdminService.updateMemberPermissions(memberId, permissions, req.user.id);

            await auditService.logEvent({
                event_type: 'MEMBER_PERMISSIONS_UPDATED',
                user_id: req.user.id,
                user_type: 'system_admin',
                ip_address: req.ip || req.socket.remoteAddress || 'unknown',
                details: {
                    member_id: memberId,
                    updated_by: req.user.id,
                    permissions
                }
            });

            res.json({ message: "Permissions updated successfully" });
        } catch (error) {
            console.error('Error updating member permissions:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Dohvat svih članova s admin ovlastima
    async getMembersWithPermissions(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može dohvatiti ovlasti
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            const members = await systemAdminService.getMembersWithPermissions();
            res.json(members);
        } catch (error) {
            console.error('Error fetching members with permissions:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Uklanjanje svih ovlasti za člana
    async removeMemberPermissions(
        req: Request<{ memberId: string }>,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može ukloniti ovlasti
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            const memberId = parseInt(req.params.memberId);

            if (isNaN(memberId)) {
                res.status(400).json({ message: "Invalid member ID" });
                return;
            }

            // Provjera postoje li ovlasti za ovog člana
            const permissions = await systemAdminService.getMemberPermissions(memberId);

            if (!permissions) {
                res.status(404).json({ message: "Member or permissions not found" });
                return;
            }

            // Uklanjanje ovlasti
            await systemAdminService.removeMemberPermissions(memberId);

            await auditService.logEvent({
                event_type: 'MEMBER_PERMISSIONS_REMOVED',
                user_id: req.user.id,
                user_type: 'system_admin',
                ip_address: req.ip || req.socket.remoteAddress || 'unknown',
                details: {
                    member_id: memberId,
                    removed_by: req.user.id
                }
            });

            res.json({ message: "Permissions removed successfully" });
        } catch (error) {
            console.error('Error removing member permissions:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Dohvat statistika za system admin dashboard
    async getDashboardStats(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može dohvatiti statistike
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            const stats = await systemAdminService.getDashboardStats();
            res.json(stats);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Dohvat sistemskih postavki
    async getSystemSettings(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može dohvatiti sistemske postavke
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            const settings = await systemAdminService.getSystemSettings();
            res.json(settings);
        } catch (error) {
            console.error('Error fetching system settings:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Ažuriranje sistemskih postavki
    async updateSystemSettings(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može ažurirati sistemske postavke
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            // Validacija ulaznih podataka
            const { cardNumberLength, renewalStartMonth, renewalStartDay, timeZone } = req.body;

            if (
                cardNumberLength === undefined ||
                renewalStartMonth === undefined ||
                renewalStartDay === undefined
            ) {
                res.status(400).json({
                    message: "All required fields must be provided: cardNumberLength, renewalStartMonth, renewalStartDay"
                });
                return;
            }

            // Dodatna validacija
            if (cardNumberLength < 1 || cardNumberLength > 10) {
                res.status(400).json({ message: "Card number length must be between 1 and 10" });
                return;
            }

            if (renewalStartDay < 1 || renewalStartDay > 31) {
                res.status(400).json({ message: "Renewal start day must be between 1 and 31" });
                return;
            }

            if (renewalStartMonth !== 10 && renewalStartMonth !== 11) {
                res.status(400).json({ message: "Renewal start month must be 10 (November) or 11 (December)" });
                return;
            }

            // Validacija vremenske zone (ako je prisutna)
            if (timeZone && !isValidTimeZone(timeZone)) {
                res.status(400).json({ message: "Invalid time zone" });
                return;
            }

            // Ažuriranje postavki
            const updatedSettings = await systemAdminService.updateSystemSettings({
                id: 'default',
                cardNumberLength,
                renewalStartMonth,
                renewalStartDay,
                timeZone // Dodajemo vremensku zonu
            });

            // Bilježenje promjene
            await auditService.logEvent({
                event_type: 'SYSTEM_SETTINGS_UPDATED',
                user_id: req.user.id,
                user_type: 'system_admin',
                ip_address: req.ip || req.socket.remoteAddress || 'unknown',
                details: {
                    settings: {
                        cardNumberLength,
                        renewalStartMonth,
                        renewalStartDay,
                        timeZone
                    },
                    updated_by: req.user.id
                }
            });

            res.json(updatedSettings);
        } catch (error) {
            console.error('Error updating system settings:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Dohvat svih revizijskih zapisa (audit logs)
    async getAuditLogs(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može dohvatiti revizijske zapise
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            // Dohvat revizijskih zapisa
            const logs = await auditService.getAllLogs();

            res.status(200).json(logs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Dohvat svih članova sa statusom 'pending'
    async getPendingMembers(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            // Provjera autorizacije: samo system admin može dohvatiti pending članove
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            
            // Dohvat članova sa statusom 'pending'
            const pendingMembers = await prisma.member.findMany({
                where: {
                    status: 'pending'
                },
                select: {
                    member_id: true,
                    first_name: true,
                    last_name: true,
                    full_name: true,
                    email: true,
                    status: true,
                    registration_completed: true,
                    created_at: true
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
            
            res.json(pendingMembers);
        } catch (error) {
            console.error('Error fetching pending members:', error);
            res.status(500).json({ message: "Internal server error" });
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
            
            // Provjera autorizacije: samo system admin može dodjeljivati lozinke
            if (!req.user || req.user.user_type !== 'system_admin') {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            
            const adminId = req.user.id;
            console.log(`System Admin ${adminId} assigning password to member: ${memberId}`);
            
            // Hashiranje lozinke
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Dohvat člana prije ažuriranja (za audit log)
            const member = await prisma.member.findUnique({
                where: { member_id: memberId },
                select: { full_name: true, email: true }
            });
            
            if (!member) {
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            // Ažuriranje člana - postavljanje lozinke i statusa 'registered'
            await prisma.member.update({
                where: { member_id: memberId },
                data: {
                    password_hash: hashedPassword,
                    status: 'registered',
                    registration_completed: true,
                    ...(cardNumber ? { card_number: cardNumber } : {})
                }
            });
            
            // Bilježenje u audit log
            await auditService.logAction(
                'MEMBER_ACTIVATED',
                adminId,
                `System Admin activated member account for ${member.full_name} (${member.email})`,
                req,
                'success'
            );
            
            res.json({ message: 'Password assigned and member activated successfully' });
        } catch (error) {
            console.error('Error assigning password to member:', error);
            res.status(500).json({ message: 'Failed to assign password to member' });
        }
    },
};

// Pomoćna funkcija za validaciju vremenske zone
function isValidTimeZone(timeZone: string): boolean {
    try {
        // Provjerava je li vremenska zona valjana tako što pokušava stvoriti datum s njom
        Intl.DateTimeFormat(undefined, { timeZone });
        return true;
    } catch (e) {
        return false;
    }
}

export default systemAdminController;
