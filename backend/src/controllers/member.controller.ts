// backend/src/controllers/member.controller.ts
import { Request, Response } from 'express';
import memberService from '../services/member.service.js';
import { MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import bcrypt from 'bcrypt';
import authRepository from '../repositories/auth.repository.js';
import auditService from '../services/audit.service.js';
import { uploadConfig } from '../../src/config/upload.js';
import imageService from '../../src/services/image.service.js';
import stampService from '../services/stamp.service.js';
import membershipService from '../services/membership.service.js';

interface MembershipUpdateRequest {
    paymentDate: string;
    cardNumber?: string;
    stampIssued?: boolean;
}

interface MembershipTerminationRequest {
    reason: 'withdrawal' | 'non_payment' | 'expulsion' | 'death';
    endDate?: string;
}

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: DatabaseUser
        }
    }
}

interface RequestWithFile extends Request {
    file?: Express.Multer.File;
}

function handleControllerError(error: unknown, res: Response): void {
    console.error('Controller error:', error);
    if (error instanceof Error) {
        if (error.message.includes('not found')) {
            res.status(404).json({ message: error.message });
        } else {
            res.status(500).json({ message: error.message });
        }
    } else {
        res.status(500).json({ message: 'Unknown error' });
    }
}

export const memberController = {
    async getAllMembers(req: Request, res: Response): Promise<void> {
        try {
            const members = await memberService.getAllMembers();
            res.json(members);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async getMemberById(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const member = await memberService.getMemberById(memberId);
            if (member === null) {
                res.status(404).json({ message: 'Member not found' });
            } else {
                res.json(member);
            }
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async updateMember(
        req: Request<{ memberId: string }, {}, MemberUpdateData>,
        res: Response
    ): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            const updatedMember = await memberService.updateMember(memberId, req.body);
            if (req.user?.id) {
                await auditService.logAction(
                    'UPDATE_MEMBER',
                    req.user.id,
                    `Updated member: ${updatedMember.full_name}`,
                    req,
                    'success',
                    memberId
                );
            }
            res.json(updatedMember);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async updateMemberRole(
        req: Request<{ memberId: string }, {}, { role: 'member' | 'admin' | 'superuser' }>,
        res: Response
    ): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            const { role } = req.body;
    
            if (!['member', 'admin', 'superuser'].includes(role)) {
                res.status(400).json({ message: 'Invalid role' });
                return;
            }
    
            const updatedMember = await memberService.updateMemberRole(memberId, role);
    
            if (req.user?.id) {
                await auditService.logAction(
                    'UPDATE_MEMBER_ROLE',
                    req.user.id,
                    `Updated member role: ${updatedMember.full_name} to ${role}`,
                    req,
                    'success',
                    memberId
                );
            }
            console.log(`[INFO] Successfully updated role for member ${memberId} to ${role}`);
            res.json(updatedMember);
        } catch (error) {
            console.error(`[ERROR] Failed to update role for member ${req.params.memberId}:`, error);
            handleControllerError(error, res);
        }
    },

    async getMemberStats(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const stats = await memberService.getMemberStats(memberId);
            res.json(stats);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async createMember(req: Request<{}, {}, MemberCreateData>, res: Response): Promise<void> {
        try {
            // Validate required fields
            const requiredFields = ['first_name', 'last_name', 'gender', 'email', 'oib'];
            if (!req.body.first_name) {
                res.status(400).json({ message: 'first_name is required' });
                return;
            }
            if (!req.body.last_name) {
                res.status(400).json({ message: 'last_name is required' });
                return;
            }
            if (!req.body.gender) {
                res.status(400).json({ message: 'gender is required' });
                return;
            }
            if (!req.body.email) {
                res.status(400).json({ message: 'email is required' });
                return;
            }
            if (!req.body.oib) {
                res.status(400).json({ message: 'oib is required' });
                return;
            }

            // Validate OIB format
            if (!/^\d{11}$/.test(req.body.oib)) {
                res.status(400).json({ message: 'OIB must be exactly 11 digits' });
                return;
            }

            const member = await memberService.createMember(req.body);
            if (req.user && req.user.id) {
                await auditService.logAction(
                    'CREATE_MEMBER',
                    req.user.id,
                    `Created member: ${member.first_name} ${member.last_name}`,
                    req,
                    'success',
                    member.member_id
                );
            }
            res.status(201).json(member);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async assignCardNumber(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const { memberId } = req.params;
            const { cardNumber } = req.body;

            console.log('Token:', req.headers.authorization);
            console.log('Assigning card number:', { memberId, cardNumber });
            
            await membershipService.updateCardDetails(parseInt(memberId), cardNumber, true);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'ASSIGN_CARD_NUMBER',
                    req.user.id,
                    `Card number ${cardNumber} assigned to member ${memberId}`,
                    req,
                    'success',
                    parseInt(memberId)
                );
            }
            
            res.json({ message: 'Card number assigned successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            handleControllerError(error, res);
        }
    },
    
    async issueStamp(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const { memberId } = req.params;
            
            const result = await stampService.issueStamp(parseInt(memberId));
            
            if (result.success) {
                res.json({ message: 'Stamp issued successfully' });
            }
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async deleteMember(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            const deletedMember = await memberService.deleteMember(memberId);
            if (deletedMember && req.user?.id) {
                await auditService.logAction(
                    'DELETE_MEMBER',
                    req.user.id,
                    `Deleted member: ${deletedMember.full_name}`,
                    req,
                    'success',
                    memberId
                );
            }
            res.json({ message: 'Member deleted successfully' });
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async assignPassword(req: Request<{}, {}, { memberId: number; password: string }>, res: Response): Promise<void> {
        try {
            const { memberId, password } = req.body;
            console.log('Starting password assignment in member.controller');
            const hashedPassword = await bcrypt.hash(password, 10);
            await authRepository.updatePassword(memberId, hashedPassword);
            if (req.user?.id) {
                await auditService.logAction(
                    'ASSIGN_PASSWORD',
                    req.user.id,
                    `Password assigned for member ${memberId}`,
                    req,
                    'success',
                    memberId
                );
            }
            console.log('Password assignment completed');
            res.json({ message: 'Password assigned successfully' });
        } catch (error) {
            console.error('Password assignment error:', error);
            res.status(500).json({ message: 'Failed to assign password' });
        }
    },

    async getMemberWithActivities(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const memberWithActivities = await memberService.getMemberWithActivities(memberId);
            if (!memberWithActivities) {
                res.status(404).json({ message: 'Member not found' });
                return;
            }
            res.json(memberWithActivities);
        } catch (error) {
            handleControllerError(error, res);
        }
    },
	
    async updateMembership(
        req: Request<{ memberId: string }, {}, MembershipUpdateRequest>,
        res: Response
    ): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
    
            const { paymentDate, cardNumber, stampIssued } = req.body;

            // Validate payment date
            const parsedDate = new Date(paymentDate);
            if (!paymentDate || isNaN(parsedDate.getTime())) {
                res.status(400).json({ message: 'Invalid payment date format' });
                return;
            }

            // Set time to noon to avoid timezone issues
            parsedDate.setHours(12, 0, 0, 0);

            console.log('Processing payment date:', parsedDate.toISOString());
            await memberService.updateMembershipFee(memberId, new Date(paymentDate), req);
            
            if (cardNumber || stampIssued !== undefined) {
                await memberService.updateMembershipCard(
                    memberId,
                    cardNumber || '',
                    stampIssued || false
                );
            }
    
            if (req.user?.id) {
                await auditService.logAction(
                    'UPDATE_MEMBERSHIP',
                    req.user.id,
                    `Membership fee payment updated for member ${memberId}`,
                    req,
                    'success',
                    memberId
                );
            }
    
            res.json({ message: 'Membership updated successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    },

    async terminateMembership(
        req: Request<{ memberId: string }, {}, MembershipTerminationRequest>,
        res: Response
    ): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }

            const { reason, endDate } = req.body;
            await memberService.terminateMembership(
                memberId,
                reason,
                endDate ? new Date(endDate) : undefined
            );

            res.json({ message: 'Membership terminated successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    },

    async getMemberDetails(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }

            const memberDetails = await memberService.getMemberWithDetails(memberId);
            if (!memberDetails) {
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            res.json(memberDetails);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    },
    
    async uploadProfileImage(req: RequestWithFile, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            if (!req.file) {
                res.status(400).json({ message: 'No image file provided' });
                return;
            }
    
            const imagePath = await imageService.processAndSaveProfileImage(req.file, memberId);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'UPLOAD_PROFILE_IMAGE',
                    req.user.id,
                    `Profile image uploaded for member ${memberId}`,
                    req,
                    'success',
                    memberId
                );
            }
    
            res.json({ 
                message: 'Profile image uploaded successfully',
                imagePath 
            });
        } catch (error) {
            console.error('Error uploading profile image:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Error uploading profile image' 
            });
        }
    },
    
    async deleteProfileImage(req: Request, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            await imageService.deleteProfileImage(memberId);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'DELETE_PROFILE_IMAGE',
                    req.user.id,
                    `Profile image deleted for member ${memberId}`,
                    req,
                    'success',
                    memberId
                );
            }
    
            res.json({ message: 'Profile image deleted successfully' });
        } catch (error) {
            console.error('Error deleting profile image:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Error deleting profile image' 
            });
        }
    }
};

export default memberController;