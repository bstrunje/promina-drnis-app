import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect, use } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import db from '../../utils/db.js';
import activityRepository from '../../repositories/activity.repository.js';
import { Activity } from '../../../../shared/types/activity.js';

use(sinonChai);

describe('ActivityRepository', () => {
    beforeEach(() => {
        sinon.stub(db);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('create', () => {
        it('should create new activity', async () => {
            const activityData = {
                title: 'New Activity',
                description: 'New Description',
                start_date: new Date(),
                end_date: new Date(),
                location: 'Test Location',
                difficulty_level: 'moderate' as const,
                max_participants: 10,
                activity_type_id: 1,
                created_by: 1
            };

            const mockCreated = {
                ...activityData,
                activity_id: 1,
                created_at: new Date()
            };

            const clientStub = {
                query: sinon.stub().resolves({ rows: [mockCreated] }),
                release: sinon.stub()
            };

            (db.getClient as sinon.SinonStub).resolves(clientStub);
            const result = await activityRepository.create(activityData);
            expect(result).to.deep.equal(mockCreated);
        });
    });

    describe('addParticipant', () => {
        it('should add participant to activity', async () => {
            const mockParticipant = {
                participation_id: 1,
                activity_id: 1,
                member_id: 1,
                hours_spent: 2,
                verified: true
            };

            (db.query as sinon.SinonStub).resolves({ rows: [mockParticipant] });
            const result = await activityRepository.addParticipant(1, 1, 2);
            expect(result).to.deep.equal(mockParticipant);
        });
    });

    describe('removeParticipant', () => {
        it('should remove participant from activity', async () => {
            (db.query as sinon.SinonStub).resolves({ rowCount: 1 });
            const result = await activityRepository.removeParticipant(1, 1);
            expect(result).to.be.true;
        });
    });

    describe('findById', () => {
        it('should return activity by id', async () => {
            const mockActivity: Activity = {
                activity_id: 1,
                title: 'Test Activity',
                description: 'Test Description',
                start_date: new Date(),
                end_date: new Date(),
                location: 'Test Location',
                difficulty_level: 'moderate',
                max_participants: 10,
                activity_type_id: 1,
                created_by: 1,
                created_at: new Date()
            };

            (db.query as sinon.SinonStub).resolves({ rows: [mockActivity] });
            const result = await activityRepository.findById(1);
            expect(result).to.deep.equal(mockActivity);
        });

        it('should return null if activity not found', async () => {
            (db.query as sinon.SinonStub).resolves({ rows: [] });
            const result = await activityRepository.findById(1);
            expect(result).to.be.null;
        });
    });
});