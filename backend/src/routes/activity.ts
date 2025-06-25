import express from 'express';
import activityController from '../controllers/activity.controller.js';
import { authMiddleware, roles, checkRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rute dostupne svim prijavljenim članovima
router.get('/', authMiddleware, roles.requireMember, activityController.getAllActivities);

// Ruta za dohvaćanje svih tipova aktivnosti (kategorija)
router.get('/types', authMiddleware, checkRole(['member_administrator', 'member_superuser', 'member']), activityController.getAllActivityTypes);

// Ruta za dohvaćanje specifičnog tipa aktivnosti (kategorije)
router.get('/types/:typeId(\\d+)', authMiddleware, checkRole(['member_administrator', 'member_superuser', 'member']), activityController.getActivityTypeById);

// Ruta za dohvaćanje svih aktivnosti unutar određene kategorije
router.get('/category/:typeId(\\d+)', authMiddleware, checkRole(['member_administrator', 'member_superuser', 'member']), activityController.getActivitiesByTypeId);

// Ruta za dohvaćanje jedne specifične aktivnosti
router.get('/:id(\\d+)', authMiddleware, roles.requireMember, activityController.getActivityById);

// Rute dostupne samo administratorima i super-userima
router.post('/', authMiddleware, roles.requireAdmin, activityController.createActivity);
router.put('/:id(\\d+)', authMiddleware, roles.requireAdmin, activityController.updateActivity);
router.delete('/:id(\\d+)', authMiddleware, roles.requireAdmin, activityController.deleteActivity);
router.post('/:activityId/participants/:memberId', authMiddleware, roles.requireAdmin, activityController.addMemberToActivity);
router.delete('/:activityId/participants/:memberId', authMiddleware, roles.requireAdmin, activityController.removeMemberFromActivity);

export default router;
