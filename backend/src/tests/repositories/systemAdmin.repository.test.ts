import prisma from '../../utils/prisma.js';
import systemAdminRepository from '../../repositories/systemAdmin.repository.js';

describe('systemAdminRepository', () => {
    // Cleanup test admin after each test
    afterEach(async () => {
        await prisma.system_admin.deleteMany({ where: { username: { startsWith: 'test_admin_' } } });
    });

    it('should create a new system admin', async () => {
        const adminData = {
            username: 'test_admin_1',
            email: 'test_admin_1@example.com',
            password: 'TestPassword123!',
            display_name: 'Test Admin 1'
        };
        const admin = await systemAdminRepository.create(adminData);
        expect(admin).toHaveProperty('id');
        expect(admin.username).toBe(adminData.username);
        expect(admin.email).toBe(adminData.email);
        expect(admin.display_name).toBe(adminData.display_name);
        expect(admin.password_hash).toBeDefined();
    });

    it('should find admin by username', async () => {
        const adminData = {
            username: 'test_admin_2',
            email: 'test_admin_2@example.com',
            password: 'TestPassword456!',
            display_name: 'Test Admin 2'
        };
        await systemAdminRepository.create(adminData);
        const found = await systemAdminRepository.findByUsername(adminData.username);
        expect(found).not.toBeNull();
        expect(found.username).toBe(adminData.username);
    });

    it('should find admin by email', async () => {
        const adminData = {
            username: 'test_admin_3',
            email: 'test_admin_3@example.com',
            password: 'TestPassword789!',
            display_name: 'Test Admin 3'
        };
        await systemAdminRepository.create(adminData);
        const found = await systemAdminRepository.findByEmail(adminData.email);
        expect(found).not.toBeNull();
        expect(found.email).toBe(adminData.email);
    });

    it('should find admin by id', async () => {
        const adminData = {
            username: 'test_admin_4',
            email: 'test_admin_4@example.com',
            password: 'TestPassword000!',
            display_name: 'Test Admin 4'
        };
        const admin = await systemAdminRepository.create(adminData);
        const found = await systemAdminRepository.findById(admin.id);
        expect(found).not.toBeNull();
        expect(found.id).toBe(admin.id);
    });

    it('should update last login', async () => {
        const adminData = {
            username: 'test_admin_5',
            email: 'test_admin_5@example.com',
            password: 'TestPassword111!',
            display_name: 'Test Admin 5'
        };
        const admin = await systemAdminRepository.create(adminData);
        await systemAdminRepository.updateLastLogin(admin.id);
        const updated = await systemAdminRepository.findById(admin.id);
        expect(updated.last_login).not.toBeNull();
    });

    it('should change password', async () => {
        const adminData = {
            username: 'test_admin_6',
            email: 'test_admin_6@example.com',
            password: 'TestPassword222!',
            display_name: 'Test Admin 6'
        };
        const admin = await systemAdminRepository.create(adminData);
        await systemAdminRepository.changePassword(admin.id, 'NewPass333!');
        const updated = await systemAdminRepository.findById(admin.id);
        expect(updated.password_hash).not.toBe(admin.password_hash);
    });

    it('should return all admins', async () => {
        const adminData = {
            username: 'test_admin_7',
            email: 'test_admin_7@example.com',
            password: 'TestPassword444!',
            display_name: 'Test Admin 7'
        };
        await systemAdminRepository.create(adminData);
        const all = await systemAdminRepository.findAll();
        expect(Array.isArray(all)).toBe(true);
        expect(all.find(a => a.username === adminData.username)).toBeDefined();
    });

    it('should check if any admin exists', async () => {
        const adminData = {
            username: 'test_admin_8',
            email: 'test_admin_8@example.com',
            password: 'TestPassword555!',
            display_name: 'Test Admin 8'
        };
        await systemAdminRepository.create(adminData);
        const exists = await systemAdminRepository.exists();
        expect(exists).toBe(true);
    });
});
