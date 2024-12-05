import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect, use } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import memberController from '../../controllers/member.controller.js';
import { Request, Response } from 'express';
import { Member } from '../../../../shared/types/member.js';

use(sinonChai);

describe('MemberController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let memberServiceStub: any;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            json: sinon.stub(),
            status: sinon.stub().returnsThis(),
        };
        memberServiceStub = {
            getAllMembers: sinon.stub(),
            getMemberById: sinon.stub(),
            createMember: sinon.stub(),
            updateMember: sinon.stub(),
            deleteMember: sinon.stub()
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getMemberById', () => {
        it('should return member by id', async () => {
            const mockMember: Member = {
                member_id: 1,
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '1990-01-01',
                gender: 'male',
                street_address: 'Test Street',
                city: 'Test City',
                oib: '12345678901',
                cell_phone: '1234567890',
                email: 'john@test.com',
                status: 'active',
                role: 'member',
                life_status: 'employed/unemployed',
                tshirt_size: 'M',
                shell_jacket_size: 'M',
                membership_type: 'regular'
            };

            req.params = { memberId: '1' };
            memberServiceStub.getMemberById.resolves(mockMember);
            await memberController.getMemberById(req as Request<{ memberId: string }>, res as Response);
            expect(res.json).to.have.been.calledWith(mockMember);
        });
    });
});