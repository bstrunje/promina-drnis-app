// services/systemManager.service.ts
import systemManagerRepository from '../repositories/systemManager.repository.js';
import prisma from '../utils/prisma.js';
import { getCurrentDate, parseDate } from '../utils/dateUtils.js';
// import { SystemManager, CreateSystemManagerDto, AdminPermissionsModel } from '../shared/types/systemManager.js'; // Can be used for typing if necessary
// import { SystemManager, CreateSystemManagerDto, AdminPermissionsModel } from '../shared/types/systemManager.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config.js';
import db from '../utils/db.js';
import systemHealthService, { SystemHealthStatus, SystemHealthInfo, BackupInfo } from './systemHealth.service.js';

interface SystemSettings {
    id: string;
    cardNumberLength?: number | null;
    renewalStartMonth?: number | null;
    renewalStartDay?: number | null;
    timeZone?: string | null;
    updatedAt: Date;
    updatedBy?: string | null;
}

const systemManagerService = {
    // Check credentials and log in manager
    async authenticate(username: string, password: string): Promise<any> {
        // Get manager by username
        const manager = await systemManagerRepository.findByUsername(username);
        
        // If manager does not exist or has no password
        if (!manager || !(manager as any).password_hash) {
            return null;
        }
        
        // Compare password with hash
        const passwordMatch = await bcrypt.compare(password, (manager as any).password_hash);
        
        if (!passwordMatch) {
            return null;
        }
        
        // Update last login time
        await systemManagerRepository.updateLastLogin((manager as any).id);
        
        // Return manager without password
        const { password_hash, ...managerWithoutPassword } = manager as any;
        return managerWithoutPassword;
    },
    
    // Create JWT access token for manager
    generateToken(manager: any): string {
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
    generateRefreshToken(manager: any): string {
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
    async createSystemManager(managerData: any): Promise<any> {
        return systemManagerRepository.create(managerData);
    },
    
    // Check if a manager already exists in the system
    async systemManagerExists(): Promise<boolean> {
        return await systemManagerRepository.exists();
    },
    
    // Get all managers
    async getAllSystemManagers(): Promise<any[]> {
        return systemManagerRepository.findAll();
    },
    
    // Get member permissions
    async getMemberPermissions(memberId: number): Promise<any | null> {
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

            // OPTIMIZACIJA: Zamjena legacy db.query fallback s optimiziranim Prisma upitom
            console.log(`[SYSTEM-MANAGER] Dohvaćam ovlasti za člana ID: ${memberId}`);
            
            let permissions = null;
            try {
                // Koristimo ispravno ime Prisma modela prema shemi
                permissions = await prisma.memberPermissions.findUnique({
                    where: {
                        member_id: memberId
                    }
                });
                
                console.log(`[SYSTEM-MANAGER] Prisma upit uspješan za člana ${memberId}, ovlasti pronađene: ${!!permissions}`);
            } catch (prismaError) {
                console.error(`[SYSTEM-MANAGER] Prisma greška za člana ${memberId}:`, prismaError);
                
                // Umjesto fallback na db.query, vraćamo null i oslanjamo se na default ovlasti
                console.log(`[SYSTEM-MANAGER] Nema eksplicitnih ovlasti za člana ${memberId}, koristim default ovlasti`);
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
                            email: member.email,
                            role: member.role
                        }
                    };
                }
                return null;
            }

            // Return permissions with additional member data
            return {
                ...permissions,
                member: {
                    member_id: member.member_id,
                    first_name: member.first_name,
                    last_name: member.last_name,
                    full_name: `${member.first_name} ${member.last_name}`,
                    email: member.email
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
        permissions: any,
        grantedById: number
    ): Promise<void> {
        try {
            // Log received data for diagnostics
            console.log('updateMemberPermissions called with:', { memberId, permissions, grantedById });
            
            // Filter and extract only the fields that exist in the database
            // According to the Prisma schema, the only permission field is 'can_manage_end_reasons'
            const can_manage_end_reasons = permissions.can_manage_end_reasons === true;
            
            console.log('Using permission:', { can_manage_end_reasons });
            
            // First, try to find existing permissions
            const existingPermissions = await prisma.memberPermissions.findUnique({
                where: {
                    member_id: memberId
                }
            });

            const now = getCurrentDate();
            
            if (existingPermissions) {
                console.log('Existing permissions found, updating...');
                // Ako ovlasti već postoje, ažuriramo ih
                try {
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
                    console.log('Permissions updated successfully via Prisma');
                } catch (prismaError) {
                    // Ako Prisma ne uspije, koristimo direktni SQL upit
                    console.warn('Prisma error when updating permissions, falling back to SQL:', prismaError);
                    
                    await db.query(
                        `UPDATE member_permissions 
                         SET can_manage_end_reasons = $1, granted_by = $2
                         WHERE member_id = $3`,
                        [can_manage_end_reasons, grantedById, memberId]
                    );
                    console.log('Permissions updated successfully via SQL');
                }
            } else {
                console.log('No existing permissions found, creating new entry...');
                // Ako ovlasti ne postoje, kreiramo ih
                try {
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
                    console.log('Permissions created successfully via Prisma');
                } catch (prismaError) {
                    // Ako Prisma ne uspije, koristimo direktni SQL upit
                    console.warn('Prisma error when creating permissions, falling back to SQL:', prismaError);
                    
                    await db.query(
                        `INSERT INTO member_permissions (member_id, can_manage_end_reasons, granted_by, granted_at)
                         VALUES ($1, $2, $3, $4)`,
                        [memberId, can_manage_end_reasons, grantedById, now]
                    );
                    console.log('Permissions created successfully via SQL');
                }
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
    async getMembersWithPermissions(): Promise<any[]> {
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
                console.warn('Error fetching admin permissions, falling back to special role members only:', prismaError);
                
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
    async getMembersWithoutPermissions(): Promise<any[]> {
        try {
            // Dohvaćamo članove koji nemaju zapis u tablici admin_permissions
            // Kako bi suzili listu, tražimo samo aktivne članove s ulogom 'member_administrator', 'member_superuser' ili 'member'
            return db.query(`
                SELECT 
                    m.member_id, 
                    m.first_name, 
                    m.last_name, 
                    m.email,
                    m.role
                FROM member m
                WHERE m.member_id NOT IN (
                    SELECT member_id FROM admin_permissions
                )
                AND m.detailed_status = 'registered'
                AND m.role IN ('member_administrator', 'member_superuser', 'member')
                ORDER BY m.last_name, m.first_name
            `).then(result => result.rows);
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
                
                console.log('Ažuriranje postavki s parametrima:', {
                    cardNumberLength,
                    renewalStartMonth,
                    renewalStartDay,
                    timeZone,
                    id: data.id
                });
                
                // OPTIMIZACIJA: Zamjena legacy $executeRaw i $queryRaw s Prisma update operacijom
                console.log(`[SYSTEM-SETTINGS] Ažuriram postavke za ID: ${data.id}`);
                
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
                
                console.log(`[SYSTEM-SETTINGS] Postavke uspješno ažurirane za ID: ${updatedSettings.id}`);
                
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
