// repositories/systemManager.repository.ts
import prisma from '../utils/prisma.js';
import { SystemManager } from '@prisma/client';
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
    async findByUsername(organizationId: number | null, username: string): Promise<SystemManager | null> {
        // Ako je organizationId null, koristimo findFirst jer findUnique ne podržava null u composite key
        if (organizationId === null) {
            return prisma.systemManager.findFirst({
                where: { 
                    organization_id: null,
                    username
                }
            });
        }
        
        return prisma.systemManager.findUnique({
            where: { 
                organization_id_username: {
                    organization_id: organizationId,
                    username
                }
            }
        });
    },
    
    // Find manager by email
    async findByEmail(organizationId: number | null, email: string): Promise<SystemManager | null> {
        // Ako je organizationId null, koristimo findFirst jer findUnique ne podržava null u composite key
        if (organizationId === null) {
            return prisma.systemManager.findFirst({
                where: { 
                    organization_id: null,
                    email
                }
            });
        }
        
        return prisma.systemManager.findUnique({
            where: { 
                organization_id_email: {
                    organization_id: organizationId,
                    email: email
                }
            }
        });
    },
    
    // Find manager by ID
    async findById(id: number): Promise<SystemManager | null> {
        return prisma.systemManager.findUnique({
            where: { id }
        });
    },
    
    // Create a new manager
    async create(organizationId: number, managerData: { username: string; email?: string | null | undefined; password: string; display_name?: string | null | undefined }): Promise<SystemManager> {
        const passwordHash = await hashPassword(managerData.password);
        
        return prisma.systemManager.create({
            data: {
                organization_id: organizationId,
                username: managerData.username,
                email: managerData.email ?? '',
                password_hash: passwordHash,
                display_name: managerData.display_name ?? '',
                password_reset_required: true
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
    async findAll(): Promise<Pick<SystemManager, 'id' | 'username' | 'email' | 'display_name' | 'last_login' | 'created_at' | 'updated_at'>[]> {
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
