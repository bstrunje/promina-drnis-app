// repositories/systemAdmin.repository.ts
import prisma from '../utils/prisma.js';
import { getCurrentDate } from '../utils/dateUtils.js';
// import { SystemAdmin, CreateSystemAdminDto } from '../shared/types/systemAdmin.js'; // Može se koristiti za tipizaciju ako je potrebno
import bcrypt from 'bcrypt';

// Pomoćne funkcije
const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

const systemAdminRepository = {
    // Dohvat administratora po korisničkom imenu
    async findByUsername(username: string): Promise<any> {
        return prisma.system_admin.findUnique({
            where: { username }
        });
    },
    
    // Dohvat administratora po email adresi
    async findByEmail(email: string): Promise<any> {
        return prisma.system_admin.findUnique({
            where: { email }
        });
    },
    
    // Dohvat administratora po ID-u
    async findById(id: number): Promise<any> {
        return prisma.system_admin.findUnique({
            where: { id }
        });
    },
    
    // Kreiranje novog administratora
    async create(adminData: any): Promise<any> {
        const passwordHash = await hashPassword(adminData.password);
        
        return prisma.system_admin.create({
            data: {
                username: adminData.username,
                email: adminData.email,
                password_hash: passwordHash,
                display_name: adminData.display_name
            }
        });
    },
    
    // Ažuriranje vremena zadnje prijave
    async updateLastLogin(id: number): Promise<void> {
        await prisma.system_admin.update({
            where: { id },
            data: { last_login: getCurrentDate() }
        });
    },
    
    // Provjera postoji li već administrator u sustavu
    async exists(): Promise<boolean> {
        const count = await prisma.system_admin.count();
        return count > 0;
    },
    
    // Promjena lozinke
    async changePassword(id: number, newPassword: string): Promise<void> {
        const passwordHash = await hashPassword(newPassword);
        
        await prisma.system_admin.update({
            where: { id },
            data: { password_hash: passwordHash }
        });
    },
    
    // Dohvat svih administratora
    async findAll(): Promise<any[]> {
        return prisma.system_admin.findMany({
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
    }
};

export default systemAdminRepository;
