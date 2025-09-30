import express from 'express';
import membershipController from '../controllers/membership.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Sve rute ovdje nasljeđuju /api/members/:memberId prefiks

router.post(
  '/membership',
  authMiddleware,
  roles.requireAdmin,
  membershipController.updateMembership
);

router.post(
  '/membership/terminate',
  authMiddleware,
  roles.requireAdmin,
  membershipController.terminateMembership
);

router.put(
  '/membership-history',
  authMiddleware,
  roles.requireAdmin,
  membershipController.updateMembershipHistory
);

router.put(
  '/membership-periods/:periodId/end-reason',
  authMiddleware,
  roles.requireAdmin,
  membershipController.updateEndReason
);

// Ruta za dohvaćanje povijesti članstva
router.get('/:memberId/history', membershipController.getMembershipHistory);

// Uklanjam iz ovdje jer nasljeđuje :memberId prefiks

export default router;
