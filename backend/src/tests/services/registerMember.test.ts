import request from 'supertest';
import app from '../../app.js'; // Pretpostavka: glavni Express app export
import prisma from '../../utils/prisma.js';
import { cleanTestDb } from '../testUtils.js';
import { faker } from '@faker-js/faker';

describe('POST /api/auth/register (Prisma ORM)', () => {
  let createdMemberId: number;

  beforeEach(async () => {
    await cleanTestDb();
  });

  afterEach(async () => {
    await cleanTestDb();
  });

  it('registrira novog člana', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Test',
        last_name: 'Member',
        oib: faker.string.numeric(11),
        cell_phone: '091' + faker.string.numeric(7),
        city: 'TestCity',
        street_address: 'Test Street 1',
        email: faker.internet.email(),
        date_of_birth: faker.date.birthdate({ min: 1950, max: 2005, mode: 'year' }).toISOString(),
        gender: 'male',
        life_status: 'pensioner',
        tshirt_size: 'L',
        shell_jacket_size: 'M',
        nickname: faker.person.firstName(),
        membership_type: 'regular'
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('member_id');
    createdMemberId = res.body.member_id;
  });

  it('ne dozvolava registraciju s postojećim OIB-om', async () => {
    const testOib = faker.string.numeric(11);
    // Prva registracija s testOib (treba biti uspješna)
    await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Test2',
        last_name: 'Member2',
        oib: testOib,
        cell_phone: '0997654321',
        city: 'TestCity',
        street_address: 'Test Street 2',
        email: faker.internet.email(),
        date_of_birth: faker.date.birthdate({ min: 1950, max: 2005, mode: 'year' }).toISOString(),
        gender: 'female',
        life_status: 'pensioner',
        tshirt_size: 'M',
        shell_jacket_size: 'L',
        nickname: faker.person.firstName(),
        membership_type: 'regular'
      });

    // Druga registracija s istim OIB-om (treba vratiti 400)
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Test2',
        last_name: 'Member2',
        oib: testOib,
        cell_phone: '0997654321',
        city: 'TestCity',
        street_address: 'Test Street 2',
        email: faker.internet.email(),
        date_of_birth: faker.date.birthdate({ min: 1950, max: 2005, mode: 'year' }).toISOString(),
        gender: 'female',
        life_status: 'pensioner',
        tshirt_size: 'M',
        shell_jacket_size: 'L',
        nickname: faker.person.firstName(),
        membership_type: 'regular'
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/OIB already exists/);
  });
});
