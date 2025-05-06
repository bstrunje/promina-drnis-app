// routes/systemAdmin.ts
import express from 'express';
import systemAdminController from '../controllers/systemAdmin.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Javne rute (bez autentikacije)
router.post('/login', systemAdminController.login);

// Provjera postoji li system admin u sustavu (potrebno za inicijalno postavljanje)
router.get('/exists', systemAdminController.checkSystemAdminExists);

// Zaštićene rute - zahtijevaju system_admin autentikaciju
router.use(authMiddleware, roles.requireSystemAdmin);

// Rute za upravljanje system adminima
router.post('/create', systemAdminController.createSystemAdmin);
router.get('/all', systemAdminController.getAllSystemAdmins);

// Ruta za dohvat statistika dashboarda
router.get('/dashboard/stats', systemAdminController.getDashboardStats);

// Rute za sistemske postavke
router.get('/settings', systemAdminController.getSystemSettings);
router.put('/settings', systemAdminController.updateSystemSettings);

// Rute za upravljanje ovlastima članova
router.get('/members-with-permissions', systemAdminController.getMembersWithPermissions);
router.get('/member-permissions/:memberId', systemAdminController.getMemberPermissions);
router.post('/update-permissions', systemAdminController.updateMemberPermissions);
router.delete('/member-permissions/:memberId', systemAdminController.removeMemberPermissions);

// Dohvat revizijskih zapisa
router.get('/audit-logs', systemAdminController.getAuditLogs);

export default router;
