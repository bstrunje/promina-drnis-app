// routes/systemManager.ts
import express from 'express';
import systemManagerController, {
  changePassword,
  changeUsername,
  refreshToken,
  logoutHandler,
  getDutySettings,
  updateDutySettings,
  getSystemSettings,
  updateSystemSettings,
} from '../controllers/systemManager.controller.js';
import * as holidayController from '../controllers/holiday.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import organizationRoutes from './organization.routes.js';

const router = express.Router();

// Javne rute (bez autentikacije)
router.post('/login', systemManagerController.login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logoutHandler);

// Provjera postoji li system manager u sustavu (potrebno za inicijalno postavljanje)
router.get('/exists', systemManagerController.checkSystemManagerExists);

// Zaštićene rute - zahtijevaju SystemManager autentikaciju
router.use(authMiddleware, roles.requireSystemManager);

// Rute za dohvat logova
router.get('/audit-logs', systemManagerController.getAuditLogs);

// Rute za promjenu lozinke i username-a (PATCH)
router.patch('/change-password', changePassword);
router.patch('/change-username', changeUsername);

// Napomena: za dohvat profila trenutnog managera koristimo rutu '/me' ispod

// Rute za upravljanje system managerima
router.post('/create', systemManagerController.createSystemManager);
router.get('/all', systemManagerController.getAllSystemManagers);

// Ruta za dohvat statistika dashboarda
router.get('/dashboard/stats', systemManagerController.getDashboardStats);

// Rute za sistemske postavke (koristimo izdvojene handlere)
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Rute za upravljanje ovlastima članova
router.get('/members-with-permissions', systemManagerController.getMembersWithPermissions);
router.get('/members-without-permissions', systemManagerController.getMembersWithoutPermissions);
router.get('/member-permissions/:memberId', systemManagerController.getMemberPermissions);
router.post('/update-permissions', systemManagerController.updateMemberPermissions);
router.delete('/member-permissions/:memberId', systemManagerController.removeMemberPermissions);

// Rute za upravljanje članovima (System Manager)
router.get('/members', systemManagerController.getAllMembersForSystemManager);
router.delete('/members/:memberId', systemManagerController.deleteMemberForSystemManager);

// Rute za upravljanje članovima sa statusom 'pending'
router.get('/pending-members', systemManagerController.getPendingMembers);
router.post('/assign-password', systemManagerController.assignPasswordToMember);
router.post('/assign-role', systemManagerController.assignRoleToMember);

// Ruta za dohvat profila trenutnog managera
router.get('/me', systemManagerController.getCurrentSystemManager);

// Rute za upravljanje sistemskim zdravljem
router.get('/system-health', systemManagerController.getSystemHealth);
router.post('/system-backup', systemManagerController.createSystemBackup);
router.post('/system-restore', systemManagerController.restoreSystemBackup);

// --- RUTE ZA UPRAVLJANJE PRAZNICIMA (Holidays Management) ---
router.get('/holidays', holidayController.getAllHolidays);
router.get('/holidays/:year', holidayController.getHolidaysForYear);
router.post('/holidays', holidayController.createHoliday);
router.put('/holidays/:id', holidayController.updateHoliday);
router.delete('/holidays/:id', holidayController.deleteHoliday);

// Seed default hrvatski praznici za godinu
router.post('/holidays/seed', holidayController.seedDefaultHolidays);

// Brisanje svih praznika za godinu
router.delete('/holidays/year/:year', holidayController.deleteHolidaysForYear);

// --- DUTY CALENDAR SETTINGS ---
router.get('/duty-settings', getDutySettings);
router.put('/duty-settings', updateDutySettings);

// --- ORGANIZATION MANAGEMENT ---
// Sve organization rute su već zaštićene s authMiddleware i requireSystemManager
router.use('/organizations', organizationRoutes);

export default router;
