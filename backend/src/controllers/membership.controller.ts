import { Request, Response } from 'express';
import membershipService from '../services/membership.service.js';
import auditService from '../services/audit.service.js';

interface MembershipUpdateRequest {
    paymentDate: string;
}

const membershipController = {
    async updateMembershipFee(req: Request<{ memberId: string }, {}, MembershipUpdateRequest>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            const { paymentDate } = req.body;

            await membershipService.processFeePayment(memberId, new Date(paymentDate), req);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'MEMBERSHIP_FEE_PAYMENT',
                    req.user.id,
                    `Membership fee updated for member ${memberId}`,
                    req,
                    'success',
                    memberId
                );
            }

            res.json({ message: 'Membership fee updated successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    }
};

export default membershipController;