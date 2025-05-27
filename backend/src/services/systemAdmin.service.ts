// services/systemAdmin.service.ts
import systemAdminRepository from '../repositories/systemAdmin.repository.js';
import prisma from '../utils/prisma.js';
import { getCurrentDate, parseDate } from '../utils/dateUtils.js';
// import { SystemAdmin, CreateSystemAdminDto, AdminPermissionsModel } from '../shared/types/systemAdmin.js'; // Može se koristiti za tipizaciju ako je potrebno
// import { SystemAdmin, CreateSystemAdminDto, AdminPermissionsModel } from '../shared/types/systemAdmin.js';
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
                permissions = await prisma.memberPermissions.findUnique({
                    where: {
                        member_id: memberId
                    }
                });
            } catch (prismaError) {
                // Ako Prisma ne uspije, koristimo direktni SQL upit
                console.warn('Prisma error when fetching permissions, falling back to SQL:', prismaError);
                
                const result = await db.query(
                    `SELECT * FROM member_permissions WHERE member_id = $1`,
                    [memberId]
                );
                
                permissions = result.rows[0];
            }

            if (!permissions) {
                // Ako član ima ulogu member_superuser ili member_administrator, vrati defaultne ovlasti
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
            // Logiramo primljene podatke za dijagnostiku
            console.log('updateMemberPermissions called with:', { memberId, permissions, grantedById });
            
            // Filtriramo i ekstrahiramo samo polja koja postoje u bazi podataka
            // Prema Prisma shemi, jedino polje dozvole je 'can_manage_end_reasons'
            const can_manage_end_reasons = permissions.can_manage_end_reasons === true;
            
            console.log('Using permission:', { can_manage_end_reasons });
            
            // Prvo pokušamo pronaći postojeće ovlasti
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
                
                // Dodaj članove s posebnim ulogama (superuser/admin) ako već nisu dodani
                for (const member of specialRoleMembers) {
                    if (!memberMap.has(member.member_id)) {
                        // Kreiraj objekt koji odgovara formatu za članove s ovlastima
                        memberMap.set(member.member_id, {
                            member_id: member.member_id,
                            // Podrazumijevane ovlasti za superuser/admin članove ako ih nemaju eksplicitno dodane
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
    
    // Dohvat članova koji nemaju administratorske ovlasti
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

    /**
     * Dohvaća tjednu povijest aktivnosti i druge ključne statistike za dashboard admina.
     * Povijest aktivnosti vraća se kao niz objekata po tjednima (zadnjih 8 tjedana).
     * @returns Objekt sa statistikom i poviješću aktivnosti
     */
    async getDashboardStats(): Promise<{
        weeklyActivityHistory: { weekStart: Date; count: number }[];
        totalActivities: number;
        totalMembers: number; // Ukupan broj članova
        registeredMembers: number; // Broj registriranih članova
        activeMembers: number; // Broj aktivnih članova
        pendingApprovals: number; // Broj članova na čekanju
        recentActivities: number; // Nedavne aktivnosti
        systemHealth: string; // Status zdravlja sustava ('Healthy', 'Warning', 'Critical')
        lastBackup: string; // Informacija o zadnjoj sigurnosnoj kopiji
        healthDetails?: SystemHealthInfo; // Detaljne informacije o zdravlju sustava (opciono)
        backupDetails?: BackupInfo; // Detaljne informacije o sigurnosnoj kopiji (opciono)
    }> {
        try {
            // Koliko tjedana povijesti vraćamo
            const NUM_WEEKS = 8;
            const now = getCurrentDate();
            // Pronađi početak ovog tjedna (ponedjeljak)
            const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 0 je nedjelja, želimo 1-7
            const startOfWeek = new Date(now); // Koristimo kopiju trenutnog datuma
            startOfWeek.setDate(now.getDate() - (dayOfWeek - 1));
            startOfWeek.setHours(0,0,0,0);

            // Generiraj tjedne granice
            const weekStarts: Date[] = [];
            for (let i = NUM_WEEKS - 1; i >= 0; i--) {
                const d = new Date(startOfWeek); // Koristimo kopiju početka tjedna
                d.setDate(startOfWeek.getDate() - i * 7);
                weekStarts.push(d);
            }

            // Dohvati sve aktivnosti iz zadnjih N tjedana
            const oldestWeek = weekStarts[0];
            const activities = await prisma.activity.findMany({
                where: {
                    start_date: {
                        gte: oldestWeek
                    }
                },
                select: {
                    start_date: true
                }
            });

            // Grupiraj aktivnosti po tjednima
            const weeklyCounts = weekStarts.map((weekStart, idx) => {
                const weekEnd = new Date(weekStart); // Koristimo kopiju početka tjedna
                weekEnd.setDate(weekEnd.getDate() + 7);
                const count = activities.filter(a => {
                    return a.start_date >= weekStart && a.start_date < weekEnd;
                }).length;
                return { weekStart, count };
            });

            // Ukupan broj aktivnosti
            const totalActivities = await prisma.activity.count();
            
            // Dohvat informacija o članovima
            const totalMembers = await prisma.member.count();
            const registeredMembers = await prisma.member.count({
                where: { status: 'registered' }
            });
            const activeMembers = await prisma.member.count({
                where: { 
                    status: 'registered',
                    last_login: { not: null }
                }
            });
            const pendingApprovals = await prisma.member.count({
                where: { status: 'pending' }
            });
            
            // Broj nedavnih aktivnosti (zadnjih 24h)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const recentActivities = await prisma.activity.count({
                where: {
                    start_date: { gte: yesterday }
                }
            });

            // Dohvat stvarnih informacija o zdravlju sustava
            const healthInfo = await systemHealthService.checkSystemHealth();
            const backupInfo = await systemHealthService.getBackupInfo();
            
            // Formatiranje za prikaz na dashboardu
            const systemHealth = systemHealthService.formatHealthStatus(healthInfo);
            const lastBackup = systemHealthService.formatBackupInfo(backupInfo);

            // Povratni objekt
            return {
                weeklyActivityHistory: weeklyCounts,
                totalActivities,
                totalMembers,
                registeredMembers,
                activeMembers,
                pendingApprovals,
                recentActivities,
                systemHealth,
                lastBackup,
                healthDetails: healthInfo,  // Detaljne informacije ako ih frontend želi prikazati
                backupDetails: backupInfo   // Detaljne informacije ako ih frontend želi prikazati
            };
        } catch (error) {
            console.error('Greška prilikom dohvaćanja dashboard statistike:', error);
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
