// repositories/systemManager.repository.ts
import prisma from '../utils/prisma.js';
import { getCurrentDate } from '../utils/dateUtils.js';
// import { SystemManager, CreateSystemManagerDto } from '../shared/types/systemManager.js'; // Može se koristiti za tipizaciju ako je potrebno
import bcrypt from 'bcrypt';

// Pomoćne funkcije
const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

const systemManagerRepository = {
    // Dohvat managera po korisničkom imenu
    async findByUsername(username: string): Promise<any> {
        return prisma.systemManager.findUnique({
            where: { username }
        });
    },
    
    // Dohvat managera po email adresi
    async findByEmail(email: string): Promise<any> {
        return prisma.systemManager.findUnique({
            where: { email }
        });
    },
    
    // Dohvat managera po ID-u
    async findById(id: number): Promise<any> {
        return prisma.systemManager.findUnique({
            where: { id }
        });
    },
    
    // Kreiranje novog managera
    async create(managerData: any): Promise<any> {
        const passwordHash = await hashPassword(managerData.password);
        
        return prisma.systemManager.create({
            data: {
                username: managerData.username,
                email: managerData.email,
                password_hash: passwordHash,
                display_name: managerData.display_name
            }
        });
    },
    
    // Ažuriranje vremena zadnje prijave
    async updateLastLogin(id: number): Promise<void> {
        await prisma.systemManager.update({
            where: { id },
            data: { last_login: getCurrentDate() }
        });
    },
    
    // Provjera postoji li već manager u sustavu
    async exists(): Promise<boolean> {
        const count = await prisma.systemManager.count();
        return count > 0;
    },
    
    // Promjena lozinke
    async changePassword(id: number, newPassword: string): Promise<void> {
        const passwordHash = await hashPassword(newPassword);
        
        await prisma.systemManager.update({
            where: { id },
            data: { password_hash: passwordHash }
        });
    },
    
    // Dohvat svih managera
    async findAll(): Promise<any[]> {
        return prisma.systemManager.findMany({
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

export default systemManagerRepository;
