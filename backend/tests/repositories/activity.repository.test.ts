// backend\tests\repositories/activity.repository.test.ts
import * as path from 'path';
import { expect } from 'chai';
import db from '../../src/utils/db';
import activityRepository from '../../src/repositories/activity.repository';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env.test') });

interface ActivityData {
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  location: string;
  activity_type_id: number;
  created_by: number;
  max_participants: number;
}

interface Activity extends ActivityData {
  activity_id: number;
}

describe('Activity Repository', () => {
  beforeEach(async () => {
    // Setup: Clear the database and insert test data
    await db.query('DELETE FROM activity_participants');
    await db.query('DELETE FROM activities');
    await db.query('DELETE FROM members');
    await db.query('DELETE FROM users');
    
    // Insert test user
    await db.query('INSERT INTO users (id, username) VALUES ($1, $2)', [1, 'testuser']);
    
    // Insert test member
    await db.query('INSERT INTO members (member_id, first_name, last_name) VALUES ($1, $2, $3)', [1, 'John', 'Doe']);
  });

  it('should find all activities', async () => {
    // Insert test activity
    await db.query(`
      INSERT INTO activities (activity_id, title, description, start_date, end_date, location, activity_type_id, created_by, max_participants)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [1, 'Test Activity', 'Test Description', new Date(), new Date(), 'Test Location', 1, 1, 10]);

    const activities = await activityRepository.findAll();
    expect(activities).to.be.an('array');
    expect(activities.length).to.equal(1);
    expect(activities[0].title).to.equal('Test Activity');
  });

  it('should find an activity by id', async () => {
    // Insert test activity
    await db.query(`
      INSERT INTO activities (activity_id, title, description, start_date, end_date, location, activity_type_id, created_by, max_participants)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [1, 'Test Activity', 'Test Description', new Date(), new Date(), 'Test Location', 1, 1, 10]);

    const activity = await activityRepository.findById(1);
    expect(activity).to.be.an('object');
    expect(activity!.title).to.equal('Test Activity');
  });

  it('should create a new activity', async () => {
    const activityData: ActivityData = {
      title: 'New Activity',
      description: 'New Description',
      start_date: new Date(),
      end_date: new Date(),
      location: 'New Location',
      activity_type_id: 1,
      created_by: 1,
      max_participants: 20
    };

    const newActivity = await activityRepository.create(activityData);
    expect(newActivity).to.be.an('object');
    expect(newActivity.title).to.equal('New Activity');
  });

  it('should add a member to an activity', async () => {
    // Insert test activity
    await db.query(`
      INSERT INTO activities (activity_id, title, description, start_date, end_date, location, activity_type_id, created_by, max_participants)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [1, 'Test Activity', 'Test Description', new Date(), new Date(), 'Test Location', 1, 1, 10]);

    const result = await activityRepository.addMember(1, 1, 2);
    expect(result).to.be.an('object');
    expect(result.activity_id).to.equal(1);
    expect(result.member_id).to.equal(1);
    expect(result.hours_spent).to.equal(2);
  });

  it('should remove a member from an activity', async () => {
    // Insert test activity
    await db.query(`
      INSERT INTO activities (activity_id, title, description, start_date, end_date, location, activity_type_id, created_by, max_participants)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [1, 'Test Activity', 'Test Description', new Date(), new Date(), 'Test Location', 1, 1, 10]);

    // Add member to activity
    await db.query('INSERT INTO activity_participants (activity_id, member_id, hours_spent) VALUES ($1, $2, $3)', [1, 1, 2]);

    const result = await activityRepository.removeMember(1, 1);
    expect(result).to.be.true;

    // Verify member was removed
    const checkQuery = 'SELECT * FROM activity_participants WHERE activity_id = $1 AND member_id = $2';
    const checkResult = await db.query(checkQuery, [1, 1]);
    expect(checkResult.rows.length).to.equal(0);
  });
});