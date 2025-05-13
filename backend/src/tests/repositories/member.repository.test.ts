import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../utils/prisma.js';
import memberRepo from '../../repositories/member.repository.js';
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();

describe('member.repository.findAll', () => {
  beforeAll(async () => {
    // Seed a test member
    await prisma.member.create({
      data: {
        first_name: 'Vitest',
        last_name: 'Tester',
        oib: '00000000006',
        cell_phone: '0910000000',
        city: 'TestCity',
        street_address: 'Test St 6'
      }
    });
  });

  afterAll(async () => {
    // Cleanup seed data
    await prisma.member.deleteMany({ where: { oib: '00000000006' } });
    await client.$disconnect();
  });

  it('returns array of members containing the seeded member', async () => {
    const members = await memberRepo.findAll();
    expect(Array.isArray(members)).toBe(true);
    const testMember = members.find(m => m.oib === '00000000006');
    expect(testMember).toBeDefined();
    expect(testMember).toHaveProperty('member_id');
    expect(testMember).toHaveProperty('full_name');
    expect(testMember).toHaveProperty('membership_details');
  });
});
