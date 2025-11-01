// ========== KONAČNA ISPRAVLJENA VERZIJA: backend/src/services/systemManager.service.ts ==========

import systemManagerRepository from '../repositories/systemManager.repository.js';
import prisma from '../utils/prisma.js';
import { invalidateSettingsCache } from '../utils/systemSettingsCache.js';
import { invalidateRoleRecognitionCache } from '../utils/roleRecognitionCache.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import bcrypt from 'bcrypt';

import jwt from 'jsonwebtoken';
import { SystemManager, MemberPermissions, Prisma } from '@prisma/client';
import { JWT_SECRET } from '../config/jwt.config.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { Request } from 'express';

type SystemSettingsExtended = {
    id: string;
    cardNumberLength: number;
    renewalStartMonth: number;
    renewalStartDay: number;
    timeZone: string | null;
    membershipTerminationDay: number | null;
    membershipTerminationMonth: number | null;
    registrationRateLimitEnabled: boolean | null;
    registrationWindowMs: number | null;
    registrationMaxAttempts: number | null;
    updatedAt: Date;
    updatedBy: number | null;
    twoFactorGlobalEnabled: boolean;
    twoFactorMembersEnabled: boolean;
    twoFactorChannelEmailEnabled: boolean;
    twoFactorChannelSmsEnabled: boolean;
    twoFactorChannelTotpEnabled: boolean;
    twoFactorTrustedDevicesEnabled: boolean;
    twoFactorOtpExpirySeconds: number | null;
    twoFactorRememberDeviceDays: number | null;
    twoFactorTotpStepSeconds: number | null;
    twoFactorTotpWindow: number | null;
    twoFactorMaxAttemptsPerHour: number | null;
    twoFactorRequiredMemberRoles: string[];
    twoFactorRequiredMemberPermissions: string[];
    // Backup settings
    backupFrequency?: string | null;
    backupRetentionDays?: number | null;
    backupStorageLocation?: string | null;
    lastBackupAt?: Date | null;
    nextBackupAt?: Date | null;
    // Password generation settings
    passwordGenerationStrategy?: 'FULLNAME_ISK_CARD' | 'RANDOM_8' | 'EMAIL_PREFIX_CARD_SUFFIX' | null;
    passwordSeparator?: string | null;
    passwordCardDigits?: number | null;
    // Activity settings
    activityHoursThreshold?: number | null;
    activityRoleRecognition?: Record<string, number> | null; // { "GUIDE": 100, "ASSISTANT_GUIDE": 50, ... }
};

type MemberSummary = {
    member_id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    role: string | null;
};

type ExistingPermissionsResponse = {
    member_id: number;
    can_manage_end_reasons: boolean;
    granted_at: Date | null;
    updated_at: Date | null;
    member: MemberSummary;
};

type DefaultSuperuserPermissionsResponse = {
    member_id: number;
    can_view_members: boolean;
    can_edit_members: boolean;
    can_add_members: boolean;
    can_manage_membership: boolean;
    can_view_activities: boolean;
    can_create_activities: boolean;
    can_approve_activities: boolean;
    can_view_financials: boolean;
    can_manage_financials: boolean;
    can_send_group_messages: boolean;
    can_manage_all_messages: boolean;
    can_view_statistics: boolean;
    can_export_data: boolean;
    can_manage_end_reasons: boolean;
    can_manage_card_numbers: boolean;
    can_assign_passwords: boolean;
    granted_by: number | null;
    granted_at: Date;
    updated_at: Date;
    member: MemberSummary;
};

const systemManagerService = {
    async authenticate(req: Request, username: string, password: string): Promise<(Omit<SystemManager, 'password_hash'> & { password_reset_required: boolean }) | null> {
        const tenantParamRaw = (req.query?.tenant ?? req.query?.branding) as unknown;
        let tenantParam: string | undefined;
        if (Array.isArray(tenantParamRaw)) {
            tenantParam = (tenantParamRaw[0] ?? '').toString().trim() || undefined;
        } else if (typeof tenantParamRaw === 'string') {
            tenantParam = tenantParamRaw.trim() || undefined;
        } else if (tenantParamRaw != null) {
            tenantParam = String(tenantParamRaw).trim() || undefined;
        }

        const tryTenantFirst = Boolean(tenantParam);

        const resolveTenantOrgId = async (): Promise<number | null> => {
            if (tenantParam) {
                try {
                    const org = await prisma.organization.findFirst({ where: { subdomain: tenantParam } });
                    if (org) return org.id;
                } catch (e) {
                    console.error('[AUTH] Error resolving organization from tenant param:', e);
                }
            }
            try {
                return getOrganizationId(req);
            } catch (_e) {
                return null;
            }
        };

        const checkCandidate = async (candidate: SystemManager | null): Promise<(Omit<SystemManager, 'password_hash'> & { password_reset_required: boolean }) | null> => {
            if (!candidate || !candidate.password_hash) return null;
            const ok = await bcrypt.compare(password, candidate.password_hash);
            if (!ok) return null;
            await systemManagerRepository.updateLastLogin(candidate.id);
            const { password_hash: _password_hash, ...without } = candidate;
            return without;
        };

        if (tryTenantFirst) {
            const orgId = await resolveTenantOrgId();
            if (orgId) {
                const tenantCandidate = await systemManagerRepository.findByUsername(orgId, username);
                const tenantResult = await checkCandidate(tenantCandidate);
                if (tenantResult) return tenantResult;
            }
        }

        const globalCandidate = await systemManagerRepository.findByUsername(null as unknown as number | null, username);
        const globalResult = await checkCandidate(globalCandidate);
        if (globalResult) return globalResult;

        if (!tryTenantFirst) {
            const orgId = await resolveTenantOrgId();
            if (orgId) {
                const tenantCandidate = await systemManagerRepository.findByUsername(orgId, username);
                const tenantResult = await checkCandidate(tenantCandidate);
                if (tenantResult) return tenantResult;
            }
        }

        return null;
    },
    
    generateToken(manager: Pick<SystemManager, 'id'>): string {
        return jwt.sign({ id: manager.id, type: 'SystemManager', role: 'SystemManager' }, JWT_SECRET, { expiresIn: '1h' });
    },
    
    generateRefreshToken(manager: Pick<SystemManager, 'id'>): string {
        return jwt.sign({ id: manager.id, type: 'SystemManager', role: 'SystemManager', tokenType: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
    },
    
    async createSystemManager(req: Request, managerData: { username: string; email?: string | null; password: string; display_name?: string | null }): Promise<SystemManager> {
        const organizationId = getOrganizationId(req);
        return systemManagerRepository.create(organizationId, managerData);
    },
    
    async systemManagerExists(): Promise<boolean> {
        return await systemManagerRepository.exists();
    },
    
    async getAllSystemManagers(): Promise<Pick<SystemManager, 'id' | 'username' | 'email' | 'display_name' | 'last_login' | 'created_at' | 'updated_at'>[]> {
        return systemManagerRepository.findAll();
    },
    
    async getMemberPermissions(memberId: number): Promise<ExistingPermissionsResponse | DefaultSuperuserPermissionsResponse | null> {
        try {
            const member = await prisma.member.findUnique({ where: { member_id: memberId } });
            if (!member) return null;

            const permissions = await prisma.memberPermissions.findUnique({
                where: { member_id: memberId },
                include: { member: { select: { member_id: true, first_name: true, last_name: true, email: true, role: true } } }
            });

            if (permissions && permissions.member) {
                return {
                    ...permissions,
                    member_id: permissions.member_id ?? memberId,
                    can_manage_end_reasons: permissions.can_manage_end_reasons ?? false,
                    member: {
                        ...permissions.member,
                        first_name: permissions.member.first_name || '',
                        last_name: permissions.member.last_name || '',
                        email: permissions.member.email || '',
                        role: permissions.member.role || null,
                        full_name: `${permissions.member.first_name || ''} ${permissions.member.last_name || ''}`.trim()
                    }
                };
            }

            if (member.role === 'superuser') {
                return {
                    member_id: member.member_id,
                    can_view_members: true,
                    can_edit_members: true,
                    can_add_members: true,
                    can_manage_membership: true,
                    can_view_activities: true,
                    can_create_activities: true,
                    can_approve_activities: true,
                    can_view_financials: true,
                    can_manage_financials: true,
                    can_send_group_messages: true,
                    can_manage_all_messages: true,
                    can_view_statistics: true,
                    can_export_data: true,
                    can_manage_end_reasons: true,
                    can_manage_card_numbers: true,
                    can_assign_passwords: true,
                    granted_by: null,
                    granted_at: new Date(),
                    updated_at: new Date(),
                    member: { 
                        member_id: member.member_id,
                        first_name: member.first_name || '',
                        last_name: member.last_name || '',
                        email: member.email || '',
                        role: member.role || null,
                        full_name: `${member.first_name || ''} ${member.last_name || ''}`.trim() 
                    }
                };
            }
            return null;
        } catch (error) {
            console.error('Error in getMemberPermissions:', error);
            throw error;
        }
    },

    async updatePermissions(memberId: number, permissions: Partial<MemberPermissions>, grantedBy: number): Promise<MemberPermissions> {
        try {
            const now = getCurrentDate();
            const existingPermissions = await prisma.memberPermissions.findUnique({ where: { member_id: memberId } });

            if (existingPermissions) {
                return await prisma.memberPermissions.update({
                    where: { member_id: memberId },
                    data: { ...permissions, updated_at: now }
                });
            } else {
                return await prisma.memberPermissions.create({
                    data: {
                        member_id: memberId,
                        ...permissions,
                        granted_by: grantedBy,
                        granted_at: now,
                        updated_at: now
                    }
                });
            }
        } catch (error) {
            console.error('Error in updatePermissions:', error);
            throw error;
        }
    },

    async getMembersWithoutPermissions(): Promise<Omit<MemberSummary, 'full_name'>[]> {
        try {
            const membersWithoutPermissions = await prisma.member.findMany({
                where: { permissions: null },
                select: { member_id: true, first_name: true, last_name: true, email: true, role: true },
                orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }]
            });
            return membersWithoutPermissions.map(m => ({ ...m, first_name: m.first_name || '', last_name: m.last_name || '', email: m.email || '', role: m.role || null }));
        } catch (error) {
            console.error('Error in getMembersWithoutPermissions:', error);
            throw error;
        }
    },

    async removeMemberPermissions(memberId: number): Promise<void> {
        try {
            await prisma.memberPermissions.delete({ where: { member_id: memberId } });
        } catch (error) {
            console.error('Error removing member permissions:', error);
            throw error;
        }
    },

async getSystemSettings(req: Request): Promise<SystemSettingsExtended> {
    try {
        // Global System Manager nema pristup Settings-ima
        const organizationId = req.user?.organization_id ?? null;
        
        if (organizationId === null) {
            throw new Error('Global System Manager cannot access organization-specific settings');
        }

        const settings = await prisma.systemSettings.findFirst({
            where: {
                organization_id: organizationId,
            },
        });

        const defaultSettings: SystemSettingsExtended = {
            id: 'default',
            cardNumberLength: 8,
            renewalStartMonth: 11,
            renewalStartDay: 1,
            timeZone: 'Europe/Zagreb',
            membershipTerminationDay: 1,
            membershipTerminationMonth: 3,
            updatedAt: getCurrentDate(),
            updatedBy: null,
            registrationRateLimitEnabled: false,
            registrationWindowMs: 3600000,
            registrationMaxAttempts: 5,
            twoFactorGlobalEnabled: false,
            twoFactorMembersEnabled: false,
            twoFactorChannelEmailEnabled: false,
            twoFactorChannelSmsEnabled: false,
            twoFactorChannelTotpEnabled: false,
            twoFactorTrustedDevicesEnabled: false,
            twoFactorOtpExpirySeconds: 300,
            twoFactorRememberDeviceDays: 30,
            twoFactorTotpStepSeconds: 30,
            twoFactorTotpWindow: 1,
            twoFactorMaxAttemptsPerHour: 10,
            twoFactorRequiredMemberRoles: [],
            twoFactorRequiredMemberPermissions: [],
            passwordGenerationStrategy: 'FULLNAME_ISK_CARD',
            passwordSeparator: '-isk-',
            passwordCardDigits: 4,
            activityHoursThreshold: 20,
            activityRoleRecognition: { GUIDE: 100, ASSISTANT_GUIDE: 50, DRIVER: 100, REGULAR: 10 }
        };

        if (settings) {
    // Spoji pronađene postavke sa zadanima da se popune sve vrijednosti
    return {
        ...defaultSettings,
        ...settings,
        id: String(settings.id), // Osiguraj da je id string
        // Osiguraj da nullable polja imaju zadane vrijednosti ako su null
        cardNumberLength: settings.cardNumberLength ?? defaultSettings.cardNumberLength,
        renewalStartMonth: settings.renewalStartMonth ?? defaultSettings.renewalStartMonth,
        renewalStartDay: settings.renewalStartDay ?? defaultSettings.renewalStartDay,
        membershipTerminationDay: settings.membershipTerminationDay ?? defaultSettings.membershipTerminationDay,
        membershipTerminationMonth: settings.membershipTerminationMonth ?? defaultSettings.membershipTerminationMonth,
        registrationRateLimitEnabled: settings.registrationRateLimitEnabled ?? defaultSettings.registrationRateLimitEnabled,
        twoFactorGlobalEnabled: settings.twoFactorGlobalEnabled ?? defaultSettings.twoFactorGlobalEnabled,
        twoFactorMembersEnabled: settings.twoFactorMembersEnabled ?? defaultSettings.twoFactorMembersEnabled,
        twoFactorChannelEmailEnabled: settings.twoFactorChannelEmailEnabled ?? defaultSettings.twoFactorChannelEmailEnabled,
        twoFactorChannelSmsEnabled: settings.twoFactorChannelSmsEnabled ?? defaultSettings.twoFactorChannelSmsEnabled,
        twoFactorChannelTotpEnabled: settings.twoFactorChannelTotpEnabled ?? defaultSettings.twoFactorChannelTotpEnabled,
        twoFactorTrustedDevicesEnabled: settings.twoFactorTrustedDevicesEnabled ?? defaultSettings.twoFactorTrustedDevicesEnabled,
        twoFactorRequiredMemberRoles: (settings.twoFactorRequiredMemberRoles as string[] | null) ?? [],
        twoFactorRequiredMemberPermissions: (settings.twoFactorRequiredMemberPermissions as string[] | null) ?? [],
        activityHoursThreshold: settings.activityHoursThreshold ?? defaultSettings.activityHoursThreshold,
        activityRoleRecognition: (settings.activityRoleRecognition as Record<string, number> | null) ?? defaultSettings.activityRoleRecognition,
    };
}

        // Ako postavke nisu pronađene, vrati zadane
        return defaultSettings;

    } catch (error) {
        console.error('Error fetching system settings:', error);
        throw new Error('Failed to fetch system settings');
    }
},
    
    async updateSystemSettings(data: Partial<SystemSettingsExtended>, updatedBy: string): Promise<SystemSettingsExtended> {
        try {
            const manager = await prisma.systemManager.findUnique({ 
                where: { id: parseInt(updatedBy, 10) },
                select: { organization_id: true }
            });
    
            if (!manager) {
                throw new Error('System Manager not found');
            }
            
            if (manager.organization_id === null) {
                throw new Error('Global System Manager cannot modify organization-specific settings');
            }
            const organizationId = manager.organization_id;
    
            // Izbaci 'id' polje jer se ne koristi u update operaciji
            const { id: _id, ...validData } = data as SystemSettingsExtended & { id: string };

            const updatedSettings = await prisma.systemSettings.update({
                where: { organization_id: organizationId },
                data: {
                    ...validData,
                    updatedAt: getCurrentDate(),
                    updatedBy: parseInt(updatedBy, 10),
                    twoFactorRequiredMemberRoles: validData.twoFactorRequiredMemberRoles ?? Prisma.JsonNull,
                    twoFactorRequiredMemberPermissions: validData.twoFactorRequiredMemberPermissions ?? Prisma.JsonNull,
                    activityRoleRecognition: validData.activityRoleRecognition ?? Prisma.JsonNull,
                },
            });
    
            // Invalidira cache nakon update-a
            invalidateSettingsCache(organizationId);
            invalidateRoleRecognitionCache(organizationId);
    
            return {
                id: String(updatedSettings.id),
                cardNumberLength: updatedSettings.cardNumberLength ?? 5,
                renewalStartMonth: updatedSettings.renewalStartMonth ?? 11,
                renewalStartDay: updatedSettings.renewalStartDay ?? 1,
                timeZone: updatedSettings.timeZone ?? 'Europe/Zagreb',
                membershipTerminationDay: updatedSettings.membershipTerminationDay ?? 1,
                membershipTerminationMonth: updatedSettings.membershipTerminationMonth ?? 3,
                updatedAt: updatedSettings.updatedAt,
                updatedBy: updatedSettings.updatedBy,
                registrationRateLimitEnabled: updatedSettings.registrationRateLimitEnabled ?? false,
                registrationWindowMs: updatedSettings.registrationWindowMs ?? 3600000,
                registrationMaxAttempts: updatedSettings.registrationMaxAttempts ?? 5,
                twoFactorGlobalEnabled: updatedSettings.twoFactorGlobalEnabled ?? false,
                twoFactorMembersEnabled: updatedSettings.twoFactorMembersEnabled ?? false,
                twoFactorChannelEmailEnabled: updatedSettings.twoFactorChannelEmailEnabled ?? false,
                twoFactorChannelSmsEnabled: updatedSettings.twoFactorChannelSmsEnabled ?? false,
                twoFactorChannelTotpEnabled: updatedSettings.twoFactorChannelTotpEnabled ?? false,
                twoFactorTrustedDevicesEnabled: validData.twoFactorTrustedDevicesEnabled ?? false as boolean,
                twoFactorOtpExpirySeconds: updatedSettings.twoFactorOtpExpirySeconds ?? 300,
                twoFactorRememberDeviceDays: updatedSettings.twoFactorRememberDeviceDays ?? 30,
                twoFactorTotpStepSeconds: updatedSettings.twoFactorTotpStepSeconds ?? 30,
                twoFactorTotpWindow: updatedSettings.twoFactorTotpWindow ?? 1,
                twoFactorMaxAttemptsPerHour: updatedSettings.twoFactorMaxAttemptsPerHour ?? 10,
                twoFactorRequiredMemberRoles: (updatedSettings.twoFactorRequiredMemberRoles as string[] | null) ?? [],
                twoFactorRequiredMemberPermissions: (updatedSettings.twoFactorRequiredMemberPermissions as string[] | null) ?? [],
                backupFrequency: updatedSettings.backupFrequency,
                backupRetentionDays: updatedSettings.backupRetentionDays,
                backupStorageLocation: updatedSettings.backupStorageLocation,
                lastBackupAt: updatedSettings.lastBackupAt,
                nextBackupAt: updatedSettings.nextBackupAt,
                passwordGenerationStrategy: updatedSettings.passwordGenerationStrategy ?? 'FULLNAME_ISK_CARD',
                passwordSeparator: updatedSettings.passwordSeparator ?? '-isk-',
                passwordCardDigits: updatedSettings.passwordCardDigits ?? 4,
                activityHoursThreshold: updatedSettings.activityHoursThreshold ?? 20,
                activityRoleRecognition: (updatedSettings.activityRoleRecognition as Record<string, number> | null) ?? { GUIDE: 100, ASSISTANT_GUIDE: 50, DRIVER: 100, REGULAR: 10 },
            };
    
        } catch (error) {
            console.error('Error updating system settings:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error('Postavke sustava za ovu organizaciju ne postoje i ne mogu se ažurirati.');
            }
            throw new Error('Failed to update system settings');
        }
    },

    async getDashboardStats(req: Request) {
        try {
            const organizationId = req.user?.organization_id;
            const whereClause = organizationId ? { organization_id: organizationId } : {};

            const totalMembers = await prisma.member.count({ where: whereClause });
            const activeMembers = await prisma.member.count({
                where: { ...whereClause, status: 'active' }
            });
            const totalActivities = await prisma.activity.count({ where: whereClause });
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const recentActivitiesList = await prisma.activity.findMany({
                where: {
                    ...whereClause,
                    start_date: { gte: thirtyDaysAgo },
                },
                include: {
                    activity_type: true,
                    participants: true,
                },
                orderBy: { start_date: 'desc' },
            });

            const recentActivitiesCount = recentActivitiesList.length;

            const totalAuditLogs = await prisma.auditLog.count({ where: whereClause });
            // Pending registrations = članovi koji nisu završili registraciju (registration_completed = false)
            const pendingRegistrations = await prisma.member.count({ where: { ...whereClause, registration_completed: false } });

            // Mock data for system health and backup
            const healthDetails = {
                status: 'Healthy',
                dbConnection: true,
                diskSpace: { available: 100 * 1024 * 1024 * 1024, total: 256 * 1024 * 1024 * 1024, percentUsed: 60 },
                memory: { available: 4 * 1024 * 1024 * 1024, total: 16 * 1024 * 1024 * 1024, percentUsed: 75 },
                uptime: 1234567,
                lastCheck: new Date(),
            };

            // Global SystemManager (organization_id = null) ili Organization-specific SystemManager
            const systemSettings = organizationId !== undefined
                ? await prisma.systemSettings.findUnique({ where: { organization_id: organizationId } })
                : await prisma.systemSettings.findFirst({ where: { organization_id: null } });

            return {
                totalMembers,
                activeMembers,
                totalActivities,
                recentActivities: recentActivitiesCount,
                recentActivitiesList,
                totalAuditLogs,
                pendingRegistrations,
                systemHealth: healthDetails.status,
                lastBackup: systemSettings?.lastBackupAt?.toISOString() ?? 'Never',
                healthDetails,
                systemSettings,
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw new Error('Failed to fetch dashboard statistics');
        }
    },

    async getAuditLogs(req: Request, page: number = 1, limit: number = 50) {
        try {
            const offset = (page - 1) * limit;
            
            // Dohvati organization_id
            let organizationId: number | null = null;
            
            // Za System Manager-e, koristi organization_id iz user objekta
            if (req.user?.is_SystemManager && req.user.organization_id !== undefined) {
                organizationId = req.user.organization_id;
                console.log('SystemManager accessing audit logs for organization:', organizationId);
            } else {
                // Za članove ili Global Manager-e
                try {
                    organizationId = getOrganizationId(req);
                } catch (_error) {
                    // Global Manager - vidi sve audit logove (organization_id = null)
                    console.log('Global Manager accessing all audit logs');
                }
            }
            
            // Filtriraj po organizaciji ili prikaži sve za Global Manager
            const whereClause = organizationId ? { organization_id: organizationId } : {};
            
            const [logs, total] = await Promise.all([
                prisma.auditLog.findMany({
                    where: whereClause,
                    skip: offset,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    include: {
                        affected: {
                            select: {
                                member_id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                }),
                prisma.auditLog.count({ where: whereClause })
            ]);

            return {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            throw new Error('Failed to fetch audit logs');
        }
    },

    async getPendingMembers(organizationId: number | null | undefined) {
        const whereClause = organizationId ? { organization_id: organizationId, password_hash: null } : { password_hash: null };
        return prisma.member.findMany({
            where: whereClause,
            select: {
                member_id: true,
                first_name: true,
                last_name: true,
                email: true,
                created_at: true,
            },
            orderBy: { created_at: 'asc' },
        });
    },

    async getAllMembers(organizationId: number | null | undefined) {
        const whereClause = organizationId ? { organization_id: organizationId } : {};
        return prisma.member.findMany({ 
            where: whereClause,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        short_name: true
                    }
                }
            },
            orderBy: [
                { status: 'asc' }, // pending first, then registered
                { last_name: 'asc' },
                { first_name: 'asc' }
            ]
        });
    },

    async assignPasswordToMember(memberId: number, password: string, cardNumber: string | null, organizationId: number | null | undefined) {
        const hashedPassword = await bcrypt.hash(password, 10);

        const updateData: Prisma.MemberUpdateInput = {
            password_hash: hashedPassword,
            status: 'active',
        };

        if (cardNumber) {
            updateData.card_numbers = {
                create: {
                    card_number: cardNumber,
                    status: 'assigned',
                    assigned_at: new Date(),
                    organization_id: organizationId,
                },
            };
        }

        const whereClause: Prisma.MemberWhereUniqueInput = { member_id: memberId };

        return prisma.member.update({
            where: whereClause,
            data: updateData,
        });
    },

    async assignRoleToMember(memberId: number, role: string, _organizationId: number | null | undefined) {
        const whereClause: Prisma.MemberWhereUniqueInput = { member_id: memberId };

        return prisma.member.update({
            where: whereClause,
            data: { role },
        });
    },



    async resetOrganizationManagerCredentials(organizationId: number, performer: SystemManager): Promise<void> {
        if (performer.organization_id !== null) {
            throw new Error('Forbidden: Only Global Managers can perform this action.');
        }

        const managerToReset = await prisma.systemManager.findFirst({
            where: { organization_id: organizationId },
        });

        if (!managerToReset) {
            throw new Error('Manager for this organization not found.');
        }

        const newPassword = 'manager123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.systemManager.update({
            where: { id: managerToReset.id },
            data: {
                password_hash: hashedPassword,
                password_reset_required: true,
            },
        });
    },
};

export default systemManagerService;
