// backend/src/routes/activities.ts
import express from 'express';
import activityController from '../controllers/activity.controller.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (still require authentication)
router.get('/', authenticateToken, activityController.getAllActivities);
router.get('/:id', authenticateToken, activityController.getActivityById);

// Member+ routes
router.post('/:id/members', authenticateToken, roles.requireMember, activityController.addMemberToActivity);
router.delete('/:id/members/:memberId', authenticateToken, roles.requireMember, activityController.removeMemberFromActivity);

// Admin+ routes
router.post('/', authenticateToken, roles.requireAdmin, activityController.createActivity);
router.put('/:id', authenticateToken, roles.requireAdmin, activityController.updateActivity);
router.delete('/:id', authenticateToken, roles.requireAdmin, activityController.deleteActivity);

export default router;