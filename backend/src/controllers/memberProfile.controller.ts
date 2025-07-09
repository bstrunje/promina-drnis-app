// backend/src/controllers/memberProfile.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import memberService from '../services/member.service.js';
import auditService from '../services/audit.service.js';
import imageService from '../services/image.service.js';
import memberRepository, { MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import { handleControllerError } from '../utils/controllerUtils.js';

// Extend Express Request to include user and file
declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

const memberProfileController = {
  async createMember(
    req: Request<{}, {}, MemberCreateData>,
    res: Response
  ): Promise<void> {
    try {
      const newMember = await memberService.createMember(req.body);
      if (req.user?.id) {
        await auditService.logAction(
          'CREATE_MEMBER',
          req.user.id,
          `Created new member: ${newMember.full_name}`,
          req,
          'success',
          newMember.member_id
        );
      }
      res.status(201).json(newMember);
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
      const updatedMember = await memberService.updateMember(
        memberId,
        req.body
      );
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
    req: Request<
      { memberId: string },
      {},
      { role: 'member' | 'member_administrator' | 'member_superuser' }
    >,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const { role } = req.body;

      const updatedMember = await memberService.updateMemberRole(memberId, role);

      if (req.user?.id) {
        await auditService.logAction(
          'UPDATE_MEMBER_ROLE',
          req.user.id,
          `Updated role for member ${updatedMember.full_name} to ${role}`,
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

  async uploadProfileImage(req: RequestWithFile, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const file = req.file;

      if (!file) {
        res.status(400).json({ message: 'No file uploaded.' });
        return;
      }

      const imageUrl = await imageService.processAndSaveProfileImage(file, memberId);

      if (req.user?.id) {
        await auditService.logAction(
          'UPLOAD_PROFILE_IMAGE',
          req.user.id,
          `Uploaded profile image for member ${memberId}`,
          req,
          'success',
          memberId
        );
      }

      res.json({ imageUrl });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async deleteProfileImage(req: Request, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);

      await imageService.deleteProfileImage(memberId);

      if (req.user?.id) {
        await auditService.logAction(
          'DELETE_PROFILE_IMAGE',
          req.user.id,
          `Deleted profile image for member ${memberId}`,
          req,
          'success',
          memberId
        );
      }

      res.status(200).json({ message: 'Profile image deleted successfully.' });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async assignPassword(
    req: Request<
      {},
      {},
      { memberId: number; password: string; cardNumber?: string }
    >,
    res: Response
  ): Promise<void> {
    try {
      const { memberId, password, cardNumber } = req.body;

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await memberRepository.updatePassword(memberId, hashedPassword);

      if (req.user?.id) {
        await auditService.logAction(
          'ASSIGN_PASSWORD',
          req.user.id,
          `Assigned new password to member ${memberId}`,
          req,
          'success',
          memberId
        );
      }

      res.status(200).json({ message: 'Password assigned successfully' });
    } catch (error) {
      handleControllerError(error, res);
    }
  },
};

export default memberProfileController;
