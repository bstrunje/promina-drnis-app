// repositories/systemManager.repository.ts
import prisma from '../utils/prisma.js';
import { getCurrentDate } from '../utils/dateUtils.js';
// import { SystemManager, CreateSystemManagerDto } from '../shared/types/systemManager.js'; // Can be used for typing if necessary
import bcrypt from 'bcrypt';

// Helper functions
const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

const systemManagerRepository = {
    // Find manager by username
    async findByUsername(username: string): Promise<any> {
        return prisma.systemManager.findUnique({
            where: { username }
        });
    },
    
    // Find manager by email
    async findByEmail(email: string): Promise<any> {
        return prisma.systemManager.findUnique({
            where: { email }
        });
    },
    
    // Find manager by ID
    async findById(id: number): Promise<any> {
        return prisma.systemManager.findUnique({
            where: { id }
        });
    },
    
    // Create a new manager
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
    
    // Update last login time
    async updateLastLogin(id: number): Promise<void> {
        await prisma.systemManager.update({
            where: { id },
            data: { last_login: getCurrentDate() }
        });
    },
    
    // Check if a manager already exists in the system
    async exists(): Promise<boolean> {
        const count = await prisma.systemManager.count();
        return count > 0;
    },
    
    // Change password
    async changePassword(id: number, newPassword: string): Promise<void> {
        const passwordHash = await hashPassword(newPassword);
        
        await prisma.systemManager.update({
            where: { id },
            data: { password_hash: passwordHash }
        });
    },
    
    // Find all managers
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
