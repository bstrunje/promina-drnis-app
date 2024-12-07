import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect, use } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import activityController from '../../controllers/activity.controller.js';
import { Request, Response } from 'express';
import { Activity } from '../../../../shared/types/activity.js';
import { DatabaseUser } from '../../middleware/authMiddleware.js';

use(sinonChai);

describe('ActivityController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let activityServiceStub: any;

    beforeEach(() => {
        req = {
            params: {},
            body: {},
            user: {
                id: 1,
                user_id: 1,
                username: 'test',
                email: 'test@example.com',
                role_name: 'admin',
                is_active: true
            } as DatabaseUser
        };
        res = {
            json: sinon.stub(),
            status: sinon.stub().returnsThis(),
        };
        activityServiceStub = {
            getAllActivities: sinon.stub(),
            getActivityById: sinon.stub(),
            createActivity: sinon.stub(),
            updateActivity: sinon.stub(),
            deleteActivity: sinon.stub(),
            addMemberToActivity: sinon.stub(),
            removeMemberFromActivity: sinon.stub()
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getActivityById', () => {
        it('should return activity by id', async () => {
            const mockActivity: Activity = {
                activity_id: 1,
                title: 'Test Activity',
                description: 'Test Description',
                start_date: new Date(),
                end_date: new Date(),
                location: 'Test Location',
                difficulty_level: 'moderate' as const,
                max_participants: 10,
                activity_type_id: 1,
                created_by: 1,
                created_at: new Date()
            };

            req.params = { id: '1' } as { id: string };
            activityServiceStub.getActivityById.resolves(mockActivity);
            await activityController.getActivityById(req as Request<{ id: string }>, res as Response);
            expect(res.json).to.have.been.calledWith(mockActivity);
        });
    });
});