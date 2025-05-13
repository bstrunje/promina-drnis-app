// routes/systemAdmin.ts
import express from 'express';
import systemAdminController from '../controllers/systemAdmin.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import { changePassword } from '../controllers/systemAdmin.controller.js';
import { requireSystemAdmin } from '../middleware/authMiddleware.js';
import { changeUsername } from '../controllers/systemAdmin.controller.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

// Javne rute (bez autentikacije)
router.post('/login', systemAdminController.login);

// Provjera postoji li system admin u sustavu (potrebno za inicijalno postavljanje)
router.get('/exists', systemAdminController.checkSystemAdminExists);

// Rute dostupne superuser korisnicima
router.get('/audit-logs', authMiddleware, roles.requireSuperUser, systemAdminController.getAuditLogs);

// Zaštićene rute - zahtijevaju system_admin autentikaciju
router.use(authMiddleware, roles.requireSystemAdmin);

// Rute za promjenu lozinke i username-a (PATCH)
router.patch('/change-password', requireSystemAdmin, changePassword);
router.patch('/change-username', requireSystemAdmin, changeUsername);

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

// Napomena: Ruta za audit-logs je premještena iznad globalnog middleware-a kako bi bila dostupna i superuser korisnicima

// Dohvati podatke o trenutno prijavljenom system adminu
router.get('/me', requireSystemAdmin, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const admin = await prisma.systemAdmin.findUnique({ where: { id: req.user.id }, select: { id: true, username: true, display_name: true } });
  if (!admin) return res.status(404).json({ message: 'Not found' });
  res.json({ admin });
});

export default router;
