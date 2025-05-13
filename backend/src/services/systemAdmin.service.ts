// services/systemAdmin.service.ts
import systemAdminRepository from '../repositories/systemAdmin.repository.js';
import prisma from '../utils/prisma.js';
import { getCurrentDate } from '../utils/dateUtils.js';
// Privremeno koristimo any umjesto eksplicitnih tipova
// import { SystemAdmin, CreateSystemAdminDto, AdminPermissionsModel } from '../shared/types/systemAdmin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config.js';
import db from '../utils/db.js';

interface SystemSettings {
    id: string;
    cardNumberLength?: number | null;
    renewalStartMonth?: number | null;
    renewalStartDay?: number | null;
    timeZone?: string | null;
    updatedAt: Date;
    updatedBy?: string | null;
}

const systemAdminService = {
    // Provjera vjerodajnica i prijava administratora
    async authenticate(username: string, password: string): Promise<any> {
        // Dohvat administratora prema korisničkom imenu
        const admin = await systemAdminRepository.findByUsername(username);
        
        // Ako administrator ne postoji ili nema lozinku
        if (!admin || !(admin as any).password_hash) {
            return null;
        }
        
        // Usporedba lozinke s hash-om
        const passwordMatch = await bcrypt.compare(password, (admin as any).password_hash);
        
        if (!passwordMatch) {
            return null;
        }
        
        // Ažuriranje vremena zadnje prijave
        await systemAdminRepository.updateLastLogin((admin as any).id);
        
        // Vraćamo administratora bez lozinke
        const { password_hash, ...adminWithoutPassword } = admin as any;
        return adminWithoutPassword;
    },
    
    // Kreiranje JWT tokena za administratora
    generateToken(admin: any): string {
        return jwt.sign(
            { 
                id: admin.id, 
                type: 'system_admin'  // Označava tip korisnika kao system_admin
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
    },
    
    // Kreiranje novog administratora
    async createSystemAdmin(adminData: any): Promise<any> {
        return systemAdminRepository.create(adminData);
    },
    
    // Provjera postoji li već administrator u sustavu
    async systemAdminExists(): Promise<boolean> {
        return await systemAdminRepository.exists();
    },
    
    // Dohvat svih administratora
    async getAllSystemAdmins(): Promise<any[]> {
        return systemAdminRepository.findAll();
    },
    
    // Dohvat ovlasti za člana
    async getMemberPermissions(memberId: number): Promise<any | null> {
        try {
            // Provjera postoji li član
            const member = await prisma.member.findUnique({
                where: {
                    member_id: memberId
                }
            });

            if (!member) {
                return null;
            }

            // Pokušaj dohvata ovlasti koristeći Prisma
            let permissions = null;
            try {
                permissions = await prisma.adminPermissions.findUnique({
                    where: {
                        member_id: memberId
                    }
                });
            } catch (prismaError) {
                // Ako Prisma ne uspije, koristimo direktni SQL upit
                console.warn('Prisma error when fetching permissions, falling back to SQL:', prismaError);
                
                const result = await db.query(
                    `SELECT * FROM admin_permissions WHERE member_id = $1`,
                    [memberId]
                );
                
                permissions = result.rows[0];
            }

            if (!permissions) {
                return null;
            }

            // Vraćanje ovlasti s dodatnim podacima o članu
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
    
    // Ažuriranje ovlasti za člana
    async updateMemberPermissions(
        memberId: number, 
        permissions: any,
        grantedById: number
    ): Promise<void> {
        try {
            // Prvo pokušamo pronaći postojeće ovlasti
            const existingPermissions = await prisma.adminPermissions.findUnique({
                where: {
                    member_id: memberId
                }
            });

            const now = getCurrentDate();
            
            if (existingPermissions) {
                // Ako ovlasti već postoje, ažuriramo ih
                try {
                    await prisma.adminPermissions.update({
                        where: {
                            member_id: memberId
                        },
                        data: {
                            ...permissions,
                            granted_by: grantedById,
                            updated_at: now
                        }
                    });
                } catch (prismaError) {
                    // Ako Prisma ne uspije, koristimo direktni SQL upit
                    console.warn('Prisma error when updating permissions, falling back to SQL:', prismaError);
                    
                    const permissionEntries = Object.entries(permissions);
                    const updates = permissionEntries
                        .map(([key, value]) => `${key} = ${value === true ? 'true' : 'false'}`)
                        .join(', ');
                    
                    await db.query(
                        `UPDATE admin_permissions 
                         SET ${updates}, granted_by = $1, updated_at = $2
                         WHERE member_id = $3`,
                        [grantedById, now, memberId]
                    );
                }
            } else {
                // Ako ovlasti ne postoje, kreiramo ih
                try {
                    await prisma.adminPermissions.create({
                        data: {
                            member_id: memberId,
                            ...permissions,
                            granted_by: grantedById,
                            granted_at: now,
                            updated_at: now
                        }
                    });
                } catch (prismaError) {
                    // Ako Prisma ne uspije, koristimo direktni SQL upit
                    console.warn('Prisma error when creating permissions, falling back to SQL:', prismaError);
                    
                    const permissionKeys = Object.keys(permissions);
                    const permissionValues = Object.values(permissions).map(v => v === true ? 'true' : 'false');
                    
                    const columns = ['member_id', ...permissionKeys, 'granted_by', 'granted_at', 'updated_at'].join(', ');
                    const placeholders = Array.from({ length: permissionKeys.length + 3 }, (_, i) => `$${i + 1}`).join(', ');
                    
                    await db.query(
                        `INSERT INTO admin_permissions (${columns})
                         VALUES (${placeholders})`,
                        [memberId, ...permissionValues, grantedById, now, now]
                    );
                }
            }
        } catch (error) {
            console.error('Error in updateMemberPermissions:', error);
            throw error;
        }
    },
    
    // Dohvat svih članova s admin ovlastima
    async getMembersWithPermissions(): Promise<any[]> {
        try {
            // Prvo pokušavamo dohvatiti podatke korištenjem Prisma
            try {
                const result = await prisma.adminPermissions.findMany({
                    include: {
                        member: {
                            select: {
                                member_id: true,
                                first_name: true,
                                last_name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        member: {
                            last_name: 'asc'
                        }
                    }
                });
                
                // Formatiraj podatke
                return result.map(item => ({
                    ...item,
                    member: item.member ? {
                        ...item.member,
                        full_name: `${item.member.first_name} ${item.member.last_name}`
                    } : null
                }));
            } catch (prismaError) {
                // Ako Prisma ne uspije, koristimo direktni SQL upit
                console.warn('Prisma error when fetching members with permissions, falling back to SQL:', prismaError);
                
                const result = await db.query(`
                    SELECT ap.*, m.member_id, m.first_name, m.last_name, m.email 
                    FROM admin_permissions ap 
                    JOIN members m ON ap.member_id = m.member_id 
                    ORDER BY m.last_name, m.first_name
                `);
                
                // Formatiraj podatke
                return result.rows.map((row: any) => ({
                    ...row,
                    member: row.member_id ? {
                        member_id: row.member_id,
                        first_name: row.first_name,
                        last_name: row.last_name,
                        email: row.email,
                        full_name: `${row.first_name} ${row.last_name}`
                    } : null
                }));
            }
        } catch (error) {
            console.error('Error in getMembersWithPermissions:', error);
            throw error;
        }
    },
    
    // Uklanjanje svih ovlasti za člana
    async removeMemberPermissions(memberId: number): Promise<void> {
        try {
            await prisma.adminPermissions.delete({
                where: {
                    member_id: memberId
                }
            });
        } catch (error) {
            console.error('Error removing member permissions:', error);
            throw error;
        }
    },

    // Dohvat statistika za system admin dashboard
    async getDashboardStats(): Promise<any> {
        try {
            // Broj svih članova
            const totalMembers = await prisma.member.count();
            
            // Broj registriranih članova (s korisničkim računom)
            const registeredMembers = await prisma.member.count({
                where: {
                    email: {
                        not: null
                    },
                    password_hash: {
                        not: null
                    }
                }
            });
            
            // Broj aktivnih članova (status = active)
            const activeMembers = await prisma.member.count({
                where: {
                    status: 'active'
                }
            });
            
            // Broj članova koji čekaju na odobrenje (registrirani ali bez lozinke)
            const pendingApprovals = await prisma.member.count({
                where: {
                    email: {
                        not: null
                    },
                    password_hash: null
                }
            });
            
            // Broj nedavnih aktivnosti (u zadnjih 24 sata)
            // Koristimo type assertion jer ne znamo je li Activity model dostupan u Prisma shemi
            let recentActivities = 0;
            try {
                recentActivities = await (prisma as any).activity.count({
                    where: {
                        created_at: {
                            gte: new Date(getCurrentDate().getTime() - 24 * 60 * 60 * 1000) // zadnjih 24 sata
                        }
                    }
                });
            } catch (err) {
                console.warn('Activity table not available in Prisma schema, using default value', err);
            }
            
            // Dohvat podataka o zadnjoj sigurnosnoj kopiji
            let lastBackup = 'Never';
            try {
                const backupRecord = await (prisma as any).systemBackup.findFirst({
                    orderBy: {
                        created_at: 'desc'
                    }
                });
                
                if (backupRecord) {
                    lastBackup = backupRecord.created_at;
                }
            } catch (err) {
                console.warn('SystemBackup table not available in Prisma schema, using default value', err);
            }
            
            // Provjera zdravlja sustava (test verzija - uvijek vraća "Healthy")
            // U stvarnoj implementaciji bi se provjeravali resursi servera, npr. disk space, CPU load, memory
            const systemHealth = 'Healthy';
            
            return {
                totalMembers,
                registeredMembers,
                activeMembers,
                pendingApprovals,
                recentActivities,
                systemHealth,
                lastBackup
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
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
    }): Promise<SystemSettings> {
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
                        updated_at
                    ) VALUES (
                        ${data.id}, 
                        ${data.cardNumberLength || 5}, 
                        ${data.renewalStartMonth || 11}, 
                        ${data.renewalStartDay || 1}, 
                        ${data.timeZone || 'Europe/Zagreb'},
                        ${now}
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
                
                await prisma.$executeRaw`
                    UPDATE system_settings
                    SET 
                        card_number_length = ${cardNumberLength},
                        renewal_start_month = ${renewalStartMonth},
                        renewal_start_day = ${renewalStartDay},
                        time_zone = ${timeZone},
                        updated_at = ${now}
                    WHERE id = ${data.id}
                `;
                
                // Dohvati ažurirane postavke
                const updatedSettingsResult = await prisma.$queryRaw`
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
                
                const updatedSettings = Array.isArray(updatedSettingsResult) && updatedSettingsResult.length > 0 
                    ? updatedSettingsResult[0] 
                    : null;
                    
                if (!updatedSettings) {
                    throw new Error('Failed to update settings');
                }
                
                console.log('Dohvaćene postavke nakon ažuriranja:', updatedSettings);
                
                return {
                    id: updatedSettings.id,
                    cardNumberLength: updatedSettings.card_number_length,
                    renewalStartMonth: updatedSettings.renewal_start_month,
                    renewalStartDay: updatedSettings.renewal_start_day,
                    timeZone: updatedSettings.time_zone,
                    updatedAt: updatedSettings.updated_at,
                    updatedBy: updatedSettings.updated_by
                };
            }
        } catch (error) {
            console.error('Error updating system settings:', error);
            throw new Error('Failed to update system settings');
        }
    },
    
    // ... ostatak koda
};

export default systemAdminService;
