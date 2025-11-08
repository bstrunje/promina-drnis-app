// backend/src/controllers/memberProfile.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import memberService from '../services/member.service.js';
import auditService from '../services/audit.service.js';
import memberRepository, { MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';
import { handleControllerError } from '../utils/controllerUtils.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import prisma from '../utils/prisma.js';

// Tip proširenja `req.user` je centraliziran u `backend/src/global.d.ts`.

const memberProfileController = {
  async createMember(
    req: Request<Record<string, never>, Record<string, never>, MemberCreateData>,
    res: Response
  ): Promise<void> {
    try {
      const { skills, other_skills, ...rest } = req.body;
      // Provjera jedinstvenosti email-a po tenant-u
      const organizationId = getOrganizationId(req);
      if (rest.email) {
        const emailExists = await prisma.member.findFirst({
          where: { email: rest.email, organization_id: organizationId },
          select: { member_id: true }
        });
        if (emailExists) {
          res.status(400).json({ code: 'EMAIL_ALREADY_IN_USE', message: 'Email je već zauzet u ovoj organizaciji.' });
          return;
        }
      }
      const newMember = await memberService.createMember({ skills, other_skills, ...rest });
      if (req.user?.id) {
        await auditService.logAction(
          'CREATE_MEMBER',
          req.user.id,
          `Created new member: ${newMember.full_name}`,
          req,
          'success',
          newMember.member_id,
          req.user.performer_type
        );
      }
      res.status(201).json(newMember);
    } catch (error) {
      handleControllerError(error, res);
    }
  },
  async updateMember(
    req: Request<{ memberId: string }, Record<string, never>, MemberUpdateData>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const organizationId = getOrganizationId(req);
      // Provjera jedinstvenosti email-a po tenant-u pri ažuriranju (ako se šalje email)
      if (req.body?.email) {
        const exists = await prisma.member.findFirst({
          where: {
            email: req.body.email,
            organization_id: organizationId,
            member_id: { not: memberId }
          },
          select: { member_id: true }
        });
        if (exists) {
          res.status(400).json({ code: 'EMAIL_ALREADY_IN_USE', message: 'Email je već zauzet u ovoj organizaciji.' });
          return;
        }
      }
      const updatedMember = await memberService.updateMember(
        memberId,
        req.body
      );

      if (!updatedMember) {
        res.status(404).json({ message: 'Member not found' });
        return;
      }

      if (req.user?.id) {
        await auditService.logAction(
          'UPDATE_MEMBER',
          req.user.id,
          `Updated member: ${updatedMember.full_name}`,
          req,
          'success',
          memberId,
          req.user.performer_type
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
      Record<string, never>,
      { role: 'member' | 'member_administrator' | 'member_superuser' }
    >,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const { role } = req.body;

      const updatedMember = await memberService.updateMemberRole(req, memberId, role);

      if (req.user?.id) {
        await auditService.logAction(
          'UPDATE_MEMBER_ROLE',
          req.user.id,
          `Updated role for member ${updatedMember.full_name} to ${role}`,
          req,
          'success',
          memberId,
          req.user.performer_type
        );
      }

      res.json(updatedMember);
    } catch (error) {
      handleControllerError(error, res);
    }
  },



  async assignPassword(
    req: Request<
      Record<string, never>,
      Record<string, never>,
      { memberId: number; password: string; cardNumber?: string }
    >,
    res: Response
  ): Promise<void> {
    try {
      const { memberId, password, cardNumber: _cardNumber } = req.body; // _cardNumber je neiskorišteno, ali zadržano zbog API kompatibilnosti

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const organizationId = getOrganizationId(req);
      await memberRepository.updatePassword(organizationId, memberId, hashedPassword);

      if (req.user?.id) {
        await auditService.logAction(
          'ASSIGN_PASSWORD',
          req.user.id,
          `Assigned new password to member ${memberId}`,
          req,
          'success',
          memberId,
          req.user.performer_type
        );
      }

      res.status(200).json({ message: 'Password assigned successfully' });
    } catch (error) {
      handleControllerError(error, res);
    }
  },
};

export default memberProfileController;
