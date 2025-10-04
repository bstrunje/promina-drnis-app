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
        res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
        return;
      }

      const updatedMember = await membershipService.updateMembership(
        req,
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
        res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
        return;
      }

      await membershipService.updateMembershipHistory(req, Number(memberId), periods, performerId, false, performerType);
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
        res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
        return;
      }

      await membershipService.terminateMembership(
        req,
        Number(memberId),
        reason,
        endDate,
        performerId,
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
        res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
        return;
      }

      const updatedPeriod = await membershipService.updateMembershipEndReason(
        req,
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
      const { forNextYear = false } = req.body; // Čitaj forNextYear parametar iz request body
      const performerId = req.user?.id;
      const performerType = req.user?.performer_type;

      if (!performerId || !performerType) {
        res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
        return;
      }

      await stampService.issueStampToMember(req, Number(memberId), performerId, forNextYear, performerType);
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async updateEndReason(req: Request, res: Response): Promise<void> {
    try {
      const { periodId } = req.params;
      const { endReason } = req.body;
      const { memberId } = req.params;
      const performerId = req.user?.id;
      const performerType = req.user?.performer_type;
      
      await membershipService.updateMembershipEndReason(
        req,
        Number(memberId), 
        Number(periodId), 
        endReason,
        performerId,
        performerType
      );
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async getMembershipHistory(req: Request, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;
      const history = await membershipService.getMembershipHistory(Number(memberId));
      res.status(200).json(history);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async checkAutoTerminations(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 [CONTROLLER] Ručno pokretanje provjere isteklih članstava...');
      await membershipService.checkAutoTerminations();
      res.status(200).json({ 
        success: true, 
        message: 'Provjera isteklih članstava uspješno pokrenuta' 
      });
    } catch (error) {
      console.error('Greška prilikom provjere isteklih članstava:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Greška prilikom provjere isteklih članstava',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
};

export default membershipController;