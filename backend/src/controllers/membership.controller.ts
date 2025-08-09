import { Request, Response } from 'express';
import membershipService from '../services/membership.service.js';
import stampService from '../services/stamp.service.js';
import { handleControllerError } from '../utils/controllerUtils.js';
// Uklonjene neiskorištene importirane vrijednosti radi lint čistoće

const membershipController = {
  async updateMembership(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { memberId } = req.params;
      const performerId = req.user?.id;
      const performerType = req.user?.performer_type;

      if (!performerId || !performerType) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const updatedMember = await membershipService.updateMembership(
        Number(memberId),
        req.body,
        performerId,
        performerType
      );
      res.status(200).json(updatedMember);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async updateMembershipHistory(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { memberId } = req.params;
      const { periods } = req.body;
      const performerId = req.user?.id;
      const performerType = req.user?.performer_type;

      if (!performerId || !performerType) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await membershipService.updateMembershipHistory(Number(memberId), periods, performerId, false, performerType);
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async terminateMembership(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { memberId } = req.params;
      const { reason, endDate } = req.body;
      const performerId = req.user?.id;
      const performerType = req.user?.performer_type;

      if (!performerId || !performerType) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await membershipService.terminateMembership(
        Number(memberId),
        reason,
        performerId,
        endDate,
        performerType
      );
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async updateMembershipEndReason(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { memberId, periodId } = req.params;
      const { endReason } = req.body;
      const performerId = req.user?.id;
      const performerType = req.user?.performer_type;

      if (!performerId || !performerType) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const updatedPeriod = await membershipService.updateMembershipEndReason(
        Number(memberId),
        Number(periodId),
        endReason,
        performerId,
        performerType
      );

      res.json(updatedPeriod);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async issueStamp(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { memberId } = req.params;
      const performerId = req.user?.id;
      const performerType = req.user?.performer_type;

      if (!performerId || !performerType) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await stampService.issueStampToMember(Number(memberId), performerId, false, performerType);
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res);
    }
  },
};

export default membershipController;