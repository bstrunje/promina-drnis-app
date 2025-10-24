import express from 'express';
import * as dutyController from '../controllers/duty.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Sve duty rute zahtijevaju autentikaciju
router.use(authMiddleware);

/**
 * GET /api/duty/calendar/:year/:month
 * Dohvaća kompletan kalendar za mjesec (duties + holidays + settings)
 * Dostupno svim prijavljenim članovima
 */
router.get('/calendar/:year/:month', dutyController.getCalendarForMonth);

/**
 * GET /api/duty/duties/:year/:month
 * Dohvaća samo dežurstva za mjesec (bez holidays i settings)
 * Dostupno svim prijavljenim članovima
 */
router.get('/duties/:year/:month', dutyController.getDutiesForMonth);

/**
 * GET /api/duty/settings
 * Dohvaća duty settings i schedule info
 * Dostupno svim prijavljenim članovima
 */
router.get('/settings', dutyController.getDutySettings);

/**
 * POST /api/duty/options
 * Dohvaća opcije za kreiranje dežurstva (Smart Grouping preview)
 * Dostupno svim prijavljenim članovima
 */
router.post('/options', dutyController.getDutyCreationOptions);

/**
 * POST /api/duty/create
 * Kreira novo dežurstvo ili pridružuje člana postojećem
 * Dostupno svim prijavljenim članovima (za sebe)
 */
router.post('/create', dutyController.createDutyShift);

/**
 * PUT /api/duty/settings
 * Ažurira duty calendar settings
 * Dostupno samo System Manageru (kroz System Manager routes)
 * Ova ruta je backup - glavna logika je u systemManager.ts
 */
router.put('/settings', roles.requireSystemManager, dutyController.updateDutySettings);

export default router;
