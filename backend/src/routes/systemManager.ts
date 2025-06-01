// routes/systemManager.ts
import express from 'express';
import systemManagerController, {
  changePassword,
  changeUsername
} from '../controllers/systemManager.controller.js';
import { authMiddleware, roles, requireSystemManager } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

// Javne rute (bez autentikacije)
router.post('/login', systemManagerController.login);

// Provjera postoji li system manager u sustavu (potrebno za inicijalno postavljanje)
router.get('/exists', systemManagerController.checkSystemManagerExists);

// Rute dostupne superuser korisnicima
router.get('/audit-logs', authMiddleware, roles.requireSuperUser, systemManagerController.getAuditLogs);

// Zaštićene rute - zahtijevaju SystemManager autentikaciju
router.use(authMiddleware, roles.requireSystemManager);

// Rute za promjenu lozinke i username-a (PATCH)
router.patch('/change-password', changePassword);
router.patch('/change-username', changeUsername);

// Napomena: za dohvat profila trenutnog managera koristimo rutu '/me' ispod

// Rute za upravljanje system managerima
router.post('/create', systemManagerController.createSystemManager);
router.get('/all', systemManagerController.getAllSystemManagers);

// Ruta za dohvat statistika dashboarda
router.get('/dashboard/stats', systemManagerController.getDashboardStats);

// Rute za sistemske postavke
router.get('/settings', systemManagerController.getSystemSettings);
router.put('/settings', systemManagerController.updateSystemSettings);

// Rute za upravljanje ovlastima članova
router.get('/members-with-permissions', systemManagerController.getMembersWithPermissions);
router.get('/members-without-permissions', systemManagerController.getMembersWithoutPermissions);
router.get('/member-permissions/:memberId', systemManagerController.getMemberPermissions);
router.post('/update-permissions', systemManagerController.updateMemberPermissions);
router.delete('/member-permissions/:memberId', systemManagerController.removeMemberPermissions);

// Rute za upravljanje članovima sa statusom 'pending'
router.get('/pending-members', systemManagerController.getPendingMembers);
router.post('/assign-password', systemManagerController.assignPasswordToMember);

// Ruta za dohvat profila trenutnog managera
router.get('/me', systemManagerController.getCurrentSystemManager);

// Rute za upravljanje sistemskim zdravljem
router.get('/system-health', systemManagerController.getSystemHealth);
router.post('/system-backup', systemManagerController.createSystemBackup);
router.post('/system-restore', systemManagerController.restoreSystemBackup);

export default router;
