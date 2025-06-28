import express from 'express';
import * as activityController from '../controllers/activities.controller.js';
import { authMiddleware as authenticateToken, roles, canEditActivity } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Rute za Aktivnosti --- //

// Dohvati sve tipove aktivnosti (dostupno svim prijavljenim korisnicima)
router.get('/types', authenticateToken, activityController.getActivityTypes);

// Dohvati aktivnosti po tipu (dostupno svim prijavljenim korisnicima)
router.get('/type/:typeId', authenticateToken, activityController.getActivitiesByTypeId);

// Dohvati sve aktivnosti (dostupno svim prijavljenim korisnicima)
router.get('/', authenticateToken, activityController.getAllActivities);

// Dohvati jednu aktivnost po ID-u (dostupno svim prijavljenim korisnicima)
router.get('/:activityId', authenticateToken, activityController.getActivityById);

// Kreiraj novu aktivnost (samo admin i superuser)
router.post('/', authenticateToken, roles.requireAdmin, activityController.createActivity);

// Ažuriraj aktivnost (samo organizator i superuser)
router.put('/:activityId', authenticateToken, canEditActivity, activityController.updateActivity);

// Obriši aktivnost (samo superuser)
router.delete('/:activityId', authenticateToken, roles.requireSuperUser, activityController.deleteActivity);

// --- Rute za Sudionike (Participants) --- //

// Dodaj sudionika na aktivnost (samo admin i superuser)
router.post(
  '/:activityId/participants/:memberId',
  authenticateToken,
  roles.requireAdmin,
  activityController.addParticipantToActivity
);

// Ukloni sudionika s aktivnosti (samo admin i superuser)
router.delete(
  '/:activityId/participants/:memberId',
  authenticateToken,
  roles.requireAdmin,
  activityController.removeParticipantFromActivity
);

// Ažuriraj detalje sudjelovanja (npr. ručni unos sati) - ID je od 'ActivityParticipation'
router.put(
  '/participants/:participationId',
  authenticateToken,
  roles.requireAdmin,
  activityController.updateParticipationDetails
);

export default router;
