import express from 'express';
import * as activityController from '../controllers/activities.controller.js';
import { authMiddleware as authenticateToken, roles, canEditActivity } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Rute za Aktivnosti --- //

// VAŽNO: Specifične rute moraju doći prije parametarskih ruta!

// Dohvati sve tipove aktivnosti (dostupno svim prijavljenim korisnicima)
router.get('/types', authenticateToken, activityController.getActivityTypes);

// Dohvati sve aktivnosti s detaljima o sudionicima (za izračun sati - dostupno svim prijavljenim korisnicima)
router.get('/with-participants', authenticateToken, activityController.getAllActivitiesWithParticipants);

// Dohvati aktivnosti po godini s detaljima o sudionicima (NOVO - za performanse)
router.get('/by-year/:year/with-participants', authenticateToken, activityController.getActivitiesByYearWithParticipants);

// Dohvati sve aktivnosti (dostupno svim prijavljenim korisnicima)
router.get('/', authenticateToken, activityController.getAllActivities);

// --- Parametarske rute --- //

// Dohvati aktivnosti po tipu (dostupno svim prijavljenim korisnicima)
router.get('/type/:typeId', authenticateToken, activityController.getActivitiesByTypeId);

// Dohvati aktivnosti po statusu (dostupno svim prijavljenim korisnicima)
router.get('/by-status/:status', authenticateToken, activityController.getActivitiesByStatus);

// Dohvati jednu aktivnost po ID-u (mora biti jedna od zadnjih GET ruta)
router.get('/:activityId', authenticateToken, activityController.getActivityById);

// Dohvati sve aktivnosti za člana (dostupno svim prijavljenim korisnicima)
router.get('/member/:memberId', authenticateToken, activityController.getActivitiesByMemberId);

// Dohvati sve aktivnosti za člana za određenu godinu (dostupno svim prijavljenim korisnicima)
router.get('/member/:memberId/:year', authenticateToken, activityController.getParticipationsByMemberIdAndYear);

// Kreiraj novu aktivnost (samo admin i superuser)
router.post('/', authenticateToken, roles.requireAdmin, activityController.createActivity);

// Ažuriraj aktivnost (samo organizator i superuser)
router.put('/:activityId', authenticateToken, canEditActivity, activityController.updateActivity);

// Otkazivanje aktivnosti
router.patch('/:activityId/cancel', authenticateToken, canEditActivity, activityController.cancelActivity);

// Obriši aktivnost (samo superuser)
router.delete('/:activityId', authenticateToken, roles.requireSuperUser, activityController.deleteActivity);

// --- Rute za Sudionike (Participants) --- //

// Član se pridružuje aktivnosti (samo prijavljeni korisnik za sebe)
router.post('/:activityId/join', authenticateToken, activityController.joinActivity);


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
