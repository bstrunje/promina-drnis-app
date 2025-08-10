// services/systemManager.service.ts
import systemManagerRepository from '../repositories/systemManager.repository.js';
import prisma from '../utils/prisma.js';
import { getCurrentDate } from '../utils/dateUtils.js';
// import { SystemManager, CreateSystemManagerDto, AdminPermissionsModel } from '../shared/types/systemManager.js'; // Can be used for typing if necessary
// import { SystemManager, CreateSystemManagerDto, AdminPermissionsModel } from '../shared/types/systemManager.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SystemManager, MemberPermissions } from '@prisma/client';
import { JWT_SECRET } from '../config/jwt.config.js';

const isDev = process.env.NODE_ENV === 'development';

interface SystemSettings {
    id: string;
    cardNumberLength?: number | null;
    renewalStartMonth?: number | null;
    renewalStartDay?: number | null;
    timeZone?: string | null;
    updatedAt: Date;
    updatedBy?: string | null;
}

type MemberSummary = {
    member_id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    role?: string;
};

type ExistingPermissionsResponse = {
    member_id: number;
    can_manage_end_reasons: boolean;
    grantedByMember?: unknown;
    granted_at: Date | null;
    updated_at?: Date | null;
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
    granted_by: null;
    granted_at: Date;
    updated_at: Date;
    member: MemberSummary;
};

const systemManagerService = {
    // Check credentials and log in manager
    async authenticate(username: string, password: string): Promise<Omit<SystemManager, 'password_hash'> | null> {
        // Get manager by username
        const manager = await systemManagerRepository.findByUsername(username);
        
        // If manager does not exist or has no password
        if (!manager || !manager.password_hash) {
            return null;
        }
        
        // Compare password with hash
        const passwordMatch = await bcrypt.compare(password, manager.password_hash);
        
        if (!passwordMatch) {
            return null;
        }
        
        // Update last login time
        await systemManagerRepository.updateLastLogin(manager.id);
        
        // Return manager without password
        const { password_hash: _password_hash, ...managerWithoutPassword } = manager; // _password_hash: ignoriramo vrijednost radi lint pravila
        return managerWithoutPassword;
    },
    
    // Create JWT access token for manager
    generateToken(manager: Pick<SystemManager, 'id'>): string {
        return jwt.sign(
            { 
                id: manager.id, 
                type: 'SystemManager',  // Indicates the user type is SystemManager
                role: 'SystemManager'
            },
            JWT_SECRET,
            { expiresIn: '1h' } // Shorter duration for access token
        );
    },
    
    // Create JWT refresh token for manager
    generateRefreshToken(manager: Pick<SystemManager, 'id'>): string {
        return jwt.sign(
            { 
                id: manager.id, 
                type: 'SystemManager',
                role: 'SystemManager',
                tokenType: 'refresh'
            },
            JWT_SECRET,
            { expiresIn: '7d' } // Longer duration for refresh token
        );
    },
    
    // Create new manager
    async createSystemManager(managerData: { username: string; email?: string | null; password: string; display_name?: string | null }): Promise<SystemManager> {
        return systemManagerRepository.create(managerData);
    },
    
    // Check if a manager already exists in the system
    async systemManagerExists(): Promise<boolean> {
        return await systemManagerRepository.exists();
    },
    
    // Get all managers
    async getAllSystemManagers(): Promise<Pick<SystemManager, 'id' | 'username' | 'email' | 'display_name' | 'last_login' | 'created_at' | 'updated_at'>[]> {
        return systemManagerRepository.findAll();
    },
    
    // Get member permissions
    async getMemberPermissions(memberId: number): Promise<ExistingPermissionsResponse | DefaultSuperuserPermissionsResponse | null> {
        try {
            // Check if member exists
            const member = await prisma.member.findUnique({
                where: {
                    member_id: memberId
                }
            });

            if (!member) {
                return null;
            }

            if (isDev) console.log(`[SYSTEM-MANAGER] Dohvaćam ovlasti za člana ID: ${memberId}`);
            
            let permissions: MemberPermissions | null = null;
            try {
                // Koristimo ispravno ime Prisma modela prema shemi
                permissions = await prisma.memberPermissions.findUnique({
                    where: {
                        member_id: memberId
                    }
                });
                
                if (isDev) console.log(`[SYSTEM-MANAGER] Prisma upit uspješan za člana ${memberId}, ovlasti pronađene: ${!!permissions}`);
            } catch (prismaError) {
                console.error(`[SYSTEM-MANAGER] Prisma greška za člana ${memberId}:`, prismaError);
                
               if (isDev) console.log(`[SYSTEM-MANAGER] Nema eksplicitnih ovlasti za člana ${memberId}, koristim default ovlasti`);
                permissions = null;
            }

            if (!permissions) {
                // If member has role member_superuser or member_administrator, return default permissions
                if (member.role === 'member_superuser' || member.role === 'member_administrator') {
                    return {
                        member_id: member.member_id,
                        can_view_members: true,
                        can_edit_members: true,
                        can_add_members: member.role === 'member_superuser',
                        can_manage_membership: member.role === 'member_superuser',
                        can_view_activities: true,
                        can_create_activities: true,
                        can_approve_activities: member.role === 'member_superuser',
                        can_view_financials: member.role === 'member_superuser',
                        can_manage_financials: member.role === 'member_superuser',
                        can_send_group_messages: true,
                        can_manage_all_messages: member.role === 'member_superuser',
                        can_view_statistics: true,
                        can_export_data: member.role === 'member_superuser',
                        can_manage_end_reasons: member.role === 'member_superuser',
                        can_manage_card_numbers: member.role === 'member_superuser',
                        can_assign_passwords: member.role === 'member_superuser',
                        granted_by: null,
                        granted_at: getCurrentDate(),
                        updated_at: getCurrentDate(),
                        member: {
                            member_id: member.member_id,
                            first_name: member.first_name,
                            last_name: member.last_name,
                            full_name: `${member.first_name} ${member.last_name}`,
                            email: member.email || '',
                            role: member.role
                        }
                    };
                }
                return null;
            }

            // Return permissions with additional member data
            return {
                member_id: member.member_id,
                can_manage_end_reasons: !!permissions.can_manage_end_reasons,
                // Nismo dohvaćali relaciju, pa ovo ostaje nepopunjeno
                grantedByMember: undefined,
                granted_at: permissions.granted_at ?? null,
                updated_at: permissions.updated_at ?? null,
                member: {
                    member_id: member.member_id,
                    first_name: member.first_name,
                    last_name: member.last_name,
                    full_name: `${member.first_name} ${member.last_name}`,
                    email: member.email || '',
                    role: member.role
                }
            };
        } catch (error) {
            console.error('Error in getMemberPermissions:', error);
            throw error;
        }
    },
    
    // Update member permissions
    async updateMemberPermissions(
        memberId: number, 
        permissions: { can_manage_end_reasons?: unknown },
        grantedById: number
    ): Promise<void> {
        try {
            // Log received data for diagnostics
            if (isDev) console.log('updateMemberPermissions called with:', { memberId, permissions, grantedById });
            
            // Filter and extract only the fields that exist in the database
            // According to the Prisma schema, the only permission field is 'can_manage_end_reasons'
            const can_manage_end_reasons = permissions.can_manage_end_reasons === true;
            
            if (isDev) console.log('Using permission:', { can_manage_end_reasons });
            
            // First, try to find existing permissions
            const existingPermissions = await prisma.memberPermissions.findUnique({
                where: {
                    member_id: memberId
                }
            });

            const now = getCurrentDate();
            
            if (existingPermissions) {
                if (isDev) console.log('Existing permissions found, updating...');
                // Ako ovlasti već postoje, ažuriramo ih
                await prisma.memberPermissions.update({
                    where: {
                        member_id: memberId
                    },
                    data: {
                        can_manage_end_reasons: can_manage_end_reasons,
                        grantedByMember: {
                            connect: { member_id: grantedById }
                        }
                    }
                });
                if (isDev) console.log('[SYSTEM-MANAGER] Permissions updated successfully via Prisma');
            } else {
                if (isDev) console.log('No existing permissions found, creating new entry...');
                // Ako ovlasti ne postoje, kreiramo ih
                await prisma.memberPermissions.create({
                    data: {
                        can_manage_end_reasons: can_manage_end_reasons,
                        member: {
                            connect: { member_id: memberId }
                        },
                        grantedByMember: {
                            connect: { member_id: grantedById }
                        },
                        granted_at: now
                    }
                });
                if (isDev) console.log('[SYSTEM-MANAGER] Permissions created successfully via Prisma');
            }
        } catch (error) {
            console.error('Error in updateMemberPermissions:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
            }
            throw error;
        }
    },
    
    // Dohvat svih članova s admin ovlastima
    async getMembersWithPermissions(): Promise<Array<Record<string, unknown>>> {
        try {
            // Prvo dohvaćamo članove sa member_superuser ili member_administrator ulogom
            const specialRoleMembers = await prisma.member.findMany({
                where: {
                    OR: [
                        { role: 'member_superuser' },
                        { role: 'member_administrator' }
                    ]
                },
                select: {
                    member_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true
                },
                orderBy: {
                    last_name: 'asc'
                }
            });
            
            // Zatim dohvaćamo članove koji imaju admin ovlasti
            try {
                const result = await prisma.memberPermissions.findMany({
                    include: {
                        member: {
                            select: {
                                member_id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                role: true
                            }
                        }
                    },
                    orderBy: {
                        member: {
                            last_name: 'asc'
                        }
                    }
                });
                
                // Kreiraj mapu ID članova s ovlastima da izbjegnemo duplikate
                const memberMap = new Map();
                
                // Dodaj članove iz member_permissions
                for (const permission of result) {
                    if (permission.member) {
                        memberMap.set(permission.member_id, {
                            ...permission,
                            member: {
                                ...permission.member,
                                full_name: `${permission.member.first_name} ${permission.member.last_name}`
                            }
                        });
                    }
                }
                
                // Dodaj članove s posebnim ulogama (superuser/administrator) ako već nisu dodani
                for (const member of specialRoleMembers) {
                    if (!memberMap.has(member.member_id)) {
                        // Kreiraj objekt koji odgovara formatu za članove s ovlastima
                        memberMap.set(member.member_id, {
                            member_id: member.member_id,
                            // Podrazumijevane ovlasti za superuser/administrator članove ako ih nemaju eksplicitno dodane
                            can_view_members: member.role === 'member_superuser' || member.role === 'member_administrator',
                            can_edit_members: member.role === 'member_superuser' || member.role === 'member_administrator',
                            can_delete_members: member.role === 'member_superuser',
                            can_view_activities: member.role === 'member_superuser' || member.role === 'member_administrator',
                            can_edit_activities: member.role === 'member_superuser' || member.role === 'member_administrator',
                            can_delete_activities: member.role === 'member_superuser',
                            can_view_reports: member.role === 'member_superuser' || member.role === 'member_administrator',
                            can_manage_settings: member.role === 'member_superuser',
                            member: {
                                ...member,
                                full_name: `${member.first_name} ${member.last_name}`
                            },
                            // Ovi podaci mogu biti null za članove bez eksplicitnih ovlasti
                            granted_by: null,
                            granted_at: null,
                            updated_at: null
                        });
                    }
                }
                
                // Vrati vrijednosti kao array
                return Array.from(memberMap.values());
            } catch (prismaError) {
                // Ako Prisma upit za ovlasti ne uspije, vrati samo članove s posebnim ulogama
                if (isDev) console.warn('Error fetching admin permissions, falling back to special role members only:', prismaError);
                
                // Kreiraj mapu članova iz posebnih uloga
                const memberMap = new Map();
                
                for (const member of specialRoleMembers) {
                    memberMap.set(member.member_id, {
                        member_id: member.member_id,
                        can_view_members: member.role === 'member_superuser' || member.role === 'member_administrator',
                        can_edit_members: member.role === 'member_superuser' || member.role === 'member_administrator',
                        can_delete_members: member.role === 'member_superuser',
                        can_view_activities: member.role === 'member_superuser' || member.role === 'member_administrator',
                        can_edit_activities: member.role === 'member_superuser' || member.role === 'member_administrator',
                        can_delete_activities: member.role === 'member_superuser',
                        can_view_reports: member.role === 'member_superuser' || member.role === 'member_administrator',
                        can_manage_settings: member.role === 'member_superuser',
                        member: {
                            ...member,
                            full_name: `${member.first_name} ${member.last_name}`
                        },
                        granted_by: null,
                        granted_at: null,
                        updated_at: null
                    });
                }
                
                return Array.from(memberMap.values());
            }
        } catch (error) {
            console.error('Error in getMembersWithPermissions:', error);
            throw error;
        }
    },
    
    // Dohvat članova koji nemaju admin ovlasti
    async getMembersWithoutPermissions(): Promise<Array<{ member_id: number; first_name: string; last_name: string; email: string; role: string }>> {
        try {
            if (isDev) console.log('[SYSTEM-MANAGER] Dohvaćam članove koji nemaju admin ovlasti...');
            
            // Dohvaćamo članove koji nemaju zapis u tablici member_permissions
            // Kako bi suzili listu, tražimo samo aktivne članove s ulogom 'member_administrator', 'member_superuser' ili 'member'
            const membersWithoutPermissions = await prisma.member.findMany({
                where: {
                    AND: [
                        {
                            // Članovi koji NEMAJU zapis u member_permissions tablici
                            permissions: null
                        },
                        {
                            status: 'registered'
                        },
                        {
                            role: {
                                in: ['member_administrator', 'member_superuser', 'member']
                            }
                        }
                    ]
                },
                select: {
                    member_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true
                },
                orderBy: [
                    { last_name: 'asc' },
                    { first_name: 'asc' }
                ]
            });
            
            if (isDev) console.log(`[SYSTEM-MANAGER] Pronađeno ${membersWithoutPermissions.length} članova bez admin ovlasti`);
            return membersWithoutPermissions.map(m => ({
                member_id: m.member_id,
                first_name: m.first_name || '',
                last_name: m.last_name || '',
                email: m.email || '',
                role: m.role || 'member'
            }));
        } catch (error) {
            console.error('Error in getMembersWithoutPermissions:', error);
            throw error;
        }
    },
    
    // Uklanjanje svih ovlasti za člana
    async removeMemberPermissions(memberId: number): Promise<void> {
        try {
            await prisma.memberPermissions.delete({
                where: {
                    member_id: memberId
                }
            });
        } catch (error) {
            console.error('Error removing member permissions:', error);
            throw error;
        }
    },



    // Dohvat sistemskih postavki
    async getSystemSettings(): Promise<SystemSettings> {
        try {
            // Dohvati postavke direktnim SQL upitom umjesto kroz Prisma klijent
            const result = await prisma.$queryRaw`
                SELECT 
                    id, 
                    card_number_length, 
                    renewal_start_month, 
                    renewal_start_day, 
                    updated_at, 
                    updated_by,
                    time_zone
                FROM system_settings 
                WHERE id = 'default'
            `;
            
            // Pretvorba rezultata SQL upita u jedan objekt ili null
            const settings = Array.isArray(result) && result.length > 0 ? result[0] : null;
            
            if (!settings) {
                // Ako nema postavki, vrati zadane vrijednosti
                return {
                    id: 'default',
                    cardNumberLength: 5,
                    renewalStartMonth: 11, // Prosinac
                    renewalStartDay: 1,
                    timeZone: 'Europe/Zagreb', // Zadana vremenska zona
                    updatedAt: getCurrentDate()
                };
            }
            
            return {
                id: settings.id,
                cardNumberLength: settings.card_number_length,
                renewalStartMonth: settings.renewal_start_month,
                renewalStartDay: settings.renewal_start_day,
                timeZone: settings.time_zone || 'Europe/Zagreb', // Dodana vremenska zona
                updatedAt: settings.updated_at,
                updatedBy: settings.updated_by
            };
        } catch (error) {
            console.error('Error fetching system settings:', error);
            throw new Error('Failed to fetch system settings');
        }
    },
    
    async updateSystemSettings(data: {
        id: string;
        cardNumberLength?: number | null;
        renewalStartMonth?: number | null;
        renewalStartDay?: number | null;
        timeZone?: string | null;
    }, updatedBy: number): Promise<SystemSettings> { 
        try {
            // Provjeri postoje li postavke direktnim SQL upitom
            const existingSettingsResult = await prisma.$queryRaw`
                SELECT 
                    id, 
                    card_number_length, 
                    renewal_start_month, 
                    renewal_start_day, 
                    updated_at, 
                    updated_by,
                    time_zone
                FROM system_settings 
                WHERE id = ${data.id}
            `;
            
            // Pretvorba rezultata SQL upita u jedan objekt ili null
            const existingSettings = Array.isArray(existingSettingsResult) && existingSettingsResult.length > 0 
                ? existingSettingsResult[0] 
                : null;
            
            const now = getCurrentDate();
            
            if (!existingSettings) {
                // Ako ne postoje, kreiraj nove direktnim SQL upitom
                await prisma.$executeRaw`
                    INSERT INTO system_settings (
                        id, 
                        card_number_length, 
                        renewal_start_month, 
                        renewal_start_day, 
                        time_zone,
                        updated_at,
                        updated_by
                    ) VALUES (
                        ${data.id}, 
                        ${data.cardNumberLength || 5}, 
                        ${data.renewalStartMonth || 11}, 
                        ${data.renewalStartDay || 1}, 
                        ${data.timeZone || 'Europe/Zagreb'},
                        ${now},
                        ${updatedBy}
                    )
                `;
                
                // Dohvati upravo kreirane postavke
                const newSettingsResult = await prisma.$queryRaw`
                    SELECT 
                        id, 
                        card_number_length, 
                        renewal_start_month, 
                        renewal_start_day, 
                        updated_at, 
                        updated_by,
                        time_zone
                    FROM system_settings 
                    WHERE id = ${data.id}
                `;
                
                const newSettings = Array.isArray(newSettingsResult) && newSettingsResult.length > 0 
                    ? newSettingsResult[0] 
                    : null;
                    
                if (!newSettings) {
                    throw new Error('Failed to create settings');
                }
                
                return {
                    id: newSettings.id,
                    cardNumberLength: newSettings.card_number_length,
                    renewalStartMonth: newSettings.renewal_start_month,
                    renewalStartDay: newSettings.renewal_start_day,
                    timeZone: newSettings.time_zone,
                    updatedAt: newSettings.updated_at
                };
            } else {
                // Ažuriraj postojeće postavke direktnim SQL upitom
                const cardNumberLength = data.cardNumberLength !== undefined 
                    ? data.cardNumberLength 
                    : existingSettings.card_number_length;
                    
                const renewalStartMonth = data.renewalStartMonth !== undefined 
                    ? data.renewalStartMonth 
                    : existingSettings.renewal_start_month;
                    
                const renewalStartDay = data.renewalStartDay !== undefined 
                    ? data.renewalStartDay 
                    : existingSettings.renewal_start_day;
                    
                const timeZone = data.timeZone || existingSettings.time_zone || 'Europe/Zagreb';
                
                if (isDev) console.log('Ažuriranje postavki s parametrima:', {
                    cardNumberLength,
                    renewalStartMonth,
                    renewalStartDay,
                    timeZone,
                    id: data.id
                });
                
                // OPTIMIZACIJA: Zamjena legacy $executeRaw i $queryRaw s Prisma update operacijom
                if (isDev) console.log(`[SYSTEM-SETTINGS] Ažuriram postavke za ID: ${data.id}`);
                
                const updatedSettings = await prisma.systemSettings.update({
                    where: {
                        id: data.id
                    },
                    data: {
                        cardNumberLength: cardNumberLength,
                        renewalStartMonth: renewalStartMonth,
                        renewalStartDay: renewalStartDay,
                        timeZone: timeZone,
                        updatedAt: now,
                        updatedBy: updatedBy
                    }
                });
                
                if (isDev) console.log(`[SYSTEM-SETTINGS] Postavke uspješno ažurirane za ID: ${updatedSettings.id}`);
                
                return {
                    id: updatedSettings.id,
                    cardNumberLength: updatedSettings.cardNumberLength,
                    renewalStartMonth: updatedSettings.renewalStartMonth,
                    renewalStartDay: updatedSettings.renewalStartDay,
                    timeZone: updatedSettings.timeZone,
                    updatedAt: updatedSettings.updatedAt,
                    updatedBy: updatedSettings.updatedBy?.toString() || null // Type conversion za TypeScript
                };
            }
        } catch (error) {
            console.error('Error updating system settings:', error);
            throw new Error('Failed to update system settings');
        }
    },
    
    // ... ostatak koda
};

export default systemManagerService;
