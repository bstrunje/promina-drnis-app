import { Request, Response } from 'express';
import membershipService from '../services/membership.service.js';
import auditService from '../services/audit.service.js';
import permissionsService from '../services/permissions.service.js';
import { getCurrentDate, parseDate } from '../utils/dateUtils.js';

interface MembershipUpdateRequest {
    paymentDate: string;
}

const membershipController = {
    async updateMembershipFee(req: Request<{ memberId: string }, {}, MembershipUpdateRequest>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            const { paymentDate } = req.body;

            await membershipService.processFeePayment(memberId, parseDate(paymentDate), req);
            
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
    },

    async updateEndReason(req: Request, res: Response) {
        try {
            const memberId = parseInt(req.params.memberId);
            const periodId = parseInt(req.params.periodId);
            
            // Provjeri ima li korisnik dozvolu
            const permissions = await permissionsService.getMemberPermissions(req.user?.id || 0);
            
            if (!permissions?.can_manage_end_reasons && req.user?.role_name !== 'member_superuser') {
                return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
            }

            // ...rest of the update logic...
        } catch (error) {
            // ...error handling...
        }
    }
};

export default membershipController;