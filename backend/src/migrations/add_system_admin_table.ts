// migrations/add_system_admin_table.ts
import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';

/**
 * Hash lozinke za system admina
 */
async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Pomoćna funkcija za provjeru postojanja tablice
 */
async function tableExists(tableName: string): Promise<boolean> {
    const result = await prisma.$queryRaw`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
        )
    ` as any;
    
    return result[0].exists;
}

/**
 * Pomoćna funkcija za provjeru postojanja kolone u tablici
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
    const result = await prisma.$queryRaw`
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
            AND column_name = ${columnName}
        )
    ` as any;
    
    return result[0].exists;
}

/**
 * Pomoćna funkcija za provjeru postojanja system admin korisnika
 */
async function systemAdminExists(): Promise<boolean> {
    // Provjeravamo postoji li tablica
    const tableExistsResult = await tableExists('system_admins');
    if (!tableExistsResult) {
        return false;
    }
    
    // Provjeravamo postoji li ijedan korisnik u tablici
    const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM system_admins
    ` as any;
    
    return result[0].count > 0;
}

/**
 * Migracija koja dodaje SystemAdmin tablicu i proširuje AdminPermissions model
 * s dodatnim granularnim ovlastima
 */
export async function addSystemAdminTable(): Promise<void> {
    try {
        console.log('Pokretanje migracije: dodavanje SystemAdmin tablice...');
        
        // 1. Dodajemo SystemAdmin tablicu ako ne postoji
        // Provjera postojanja SystemAdmin tablice kroz SQL
        const tableExistsResult = await tableExists('system_admins');
        
        if (!tableExistsResult) {
            console.log('Kreiranje SystemAdmin tablice...');
            
            // Kreiranje tablice putem SQL-a jer možda nemamo Prisma model
            await prisma.$executeRaw`
                CREATE TABLE IF NOT EXISTS system_admins (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    display_name VARCHAR(100) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    last_login TIMESTAMP NULL
                )
            `;

            console.log('SystemAdmin tablica uspješno kreirana.');
        } else {
            console.log('SystemAdmin tablica već postoji. Preskačem.');
        }

        // 2. Proširujemo AdminPermissions model s dodatnim dozvolama
        // Provjera postoji li kolona can_manage_end_reasons u admin_permissions
        const columnExistsResult = await columnExists('admin_permissions', 'can_manage_end_reasons');
        
        if (!columnExistsResult) {
            console.log('Proširivanje AdminPermissions modela s dodatnim dozvolama...');
            
            // Dodavanje novih kolona
            await prisma.$executeRaw`
                ALTER TABLE admin_permissions
                ADD COLUMN IF NOT EXISTS can_manage_end_reasons BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_manage_card_numbers BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_assign_passwords BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_view_financials BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_manage_financials BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_send_group_messages BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_manage_all_messages BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_view_statistics BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS can_export_data BOOLEAN DEFAULT FALSE
            `;
            
            console.log('AdminPermissions model uspješno proširen.');
        } else {
            console.log('AdminPermissions već ima dodatne dozvole. Preskačem.');
        }

        // 3. Provjeravamo postoji li ijedan system admin, ako ne - kreiramo inicijalnog
        const adminExists = await systemAdminExists();
        
        if (!adminExists) {
            console.log('Provjerava se postojanje inicijalnog system admina...');
            
            // Kreiranje inicijalnog system admina ako su postavljene env varijable
            const initialUsername = process.env.INITIAL_SYSTEM_ADMIN_USERNAME;
            const initialPassword = process.env.INITIAL_SYSTEM_ADMIN_PASSWORD;
            
            if (initialUsername && initialPassword) {
                const passwordHash = await hashPassword(initialPassword);
                
                console.log(`Kreiranje inicijalnog system admina: ${initialUsername}`);
                
                // Koristimo raw SQL za inserting
                await prisma.$executeRaw`
                    INSERT INTO system_admins (username, email, display_name, password_hash) 
                    VALUES (${initialUsername}, 'admin@promina-drnis.hr', 'System Administrator', ${passwordHash})
                    ON CONFLICT (username) DO NOTHING
                `;
                
                console.log(`Inicijalni system admin "${initialUsername}" uspješno kreiran.`);
            } else {
                console.log('Nedostaju env varijable za kreiranje inicijalnog system admina. Preskačem.');
            }
        } else {
            console.log('System admin korisnik već postoji. Preskačem kreiranje inicijalnog korisnika.');
        }

        console.log('Migracija završena uspješno.');

    } catch (error) {
        console.error('Greška prilikom migracije:', error);
        throw error;
    }
}
