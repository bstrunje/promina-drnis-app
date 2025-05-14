import systemAdminService from '../../services/systemAdmin.service.js';
import prisma from '../../utils/prisma.js';
import { getCurrentDate } from '../../utils/dateUtils.js';
import { cleanTestDb } from '../testUtils.js';

describe('systemAdminService.getDashboardStats', () => {
    let testMember: any;
    let activityType: any;

    beforeAll(async () => {
        // Očisti aktivnosti i povezane entitete prije testa
        await prisma.activity.deleteMany();
        await prisma.activityType.deleteMany();
        await prisma.member.deleteMany();
        // Kreiraj testni activity_type
        activityType = await prisma.activityType.create({
            data: {
                name: 'Test Type',
                description: 'Tip za testiranje'
            }
        });
        // Kreiraj testnog člana
        testMember = await prisma.member.create({
            data: {
                first_name: 'Test',
                last_name: 'Admin',
                full_name: 'Test Admin',
                oib: '90000000001',
                cell_phone: '0990000001',
                city: 'TestGrad',
                street_address: 'Test Ulica 1',
                status: 'pending',
                role: 'member'
            }
        });
    });

    afterAll(async () => {
        // Očisti aktivnosti i zatvori konekciju
        await prisma.activity.deleteMany();
        await prisma.$disconnect();
    });

    it('vraća praznu povijest i nulu kad nema aktivnosti', async () => {
        const stats = await systemAdminService.getDashboardStats();
        expect(Array.isArray(stats.weeklyActivityHistory)).toBe(true);
        expect(stats.weeklyActivityHistory.every(e => e.count === 0)).toBe(true);
        expect(stats.totalActivities).toBe(0);
    });

    it('ispravno broji aktivnosti po tjednima', async () => {
        // Dodaj jednu aktivnost ovaj tjedan
        const now = getCurrentDate();
        await prisma.activity.create({
            data: {
                title: 'Test Aktivnost',
                start_date: now,
                end_date: now,
                description: 'Test',
                location: 'Test',
                activity_type_id: activityType.type_id, // Koristi testni activity_type
                created_by: testMember.member_id, // Koristi testnog člana
                max_participants: 10,
                difficulty_level: 'easy'
            }
        });
        const stats = await systemAdminService.getDashboardStats();
        expect(stats.totalActivities).toBe(1);
        const thisWeek = stats.weeklyActivityHistory[stats.weeklyActivityHistory.length - 1];
        expect(thisWeek.count).toBeGreaterThanOrEqual(1);
    });

    it('broji aktivnosti u više tjedana', async () => {
        // Dodaj aktivnost prije 3 tjedna
        const now = getCurrentDate();
        const threeWeeksAgo = new Date(now);
        threeWeeksAgo.setDate(now.getDate() - 21);
        await prisma.activity.create({
            data: {
                title: 'Stara Aktivnost',
                start_date: threeWeeksAgo,
                end_date: threeWeeksAgo,
                description: 'Povijest',
                location: 'Test',
                activity_type_id: activityType.type_id, // Koristi testni activity_type
                created_by: testMember.member_id, // Koristi testnog člana
                max_participants: 10,
                difficulty_level: 'easy'
            }
        });
        const stats = await systemAdminService.getDashboardStats();
        // Provjeri da barem jedan tjedan u povijesti ima count > 0
        expect(stats.weeklyActivityHistory.some(e => e.count > 0)).toBe(true);
        expect(stats.totalActivities).toBeGreaterThanOrEqual(2);
    });

    // Dodatni rubni slučajevi po potrebi...
});
