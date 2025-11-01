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
  verify2faAndProceed,
  forceChangePassword,
  setupSystemManager2faPin,
  verifySystemManager2faPin,
  disableSystemManager2fa,
  getSystemManager2faStatus,
  enableSystemManager2faForUser,
  disableSystemManager2faForUser,
  getSystemManagerTrustedDevices,
  removeSystemManagerTrustedDevice,
  getSystemManagerTrustedDevicesSettings,
  updateSystemManagerTrustedDevicesSettings,
  getOrganizationTrustedDevicesSettings,
  updateOrganizationTrustedDevicesSettings,
} from '../controllers/systemManager.controller.js';
import * as holidayController from '../controllers/holiday.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import { tenantMiddleware, optionalTenantMiddleware } from '../middleware/tenant.middleware.js';
import organizationRoutes from './organization.routes.js';

const router = express.Router();

// Javne rute (bez autentikacije)
router.post('/login', systemManagerController.login);
router.post('/verify-2fa', verify2faAndProceed);
router.post('/verify-2fa-pin', verifySystemManager2faPin);
router.post('/force-change-password', forceChangePassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', logoutHandler);

// Provjera postoji li system manager u sustavu (potrebno za inicijalno postavljanje)
router.get('/exists', systemManagerController.systemManagerExists);

// Zaštićene rute - zahtijevaju SystemManager autentikaciju
router.use(authMiddleware, roles.requireSystemManager);

// Rute za dohvat logova
router.get('/audit-logs', systemManagerController.getAuditLogs);

// Rute za promjenu lozinke i username-a (PATCH)
router.patch('/change-password', changePassword);
router.patch('/change-username', changeUsername);

// 2FA rute za System Manager
router.post('/setup-2fa-pin', setupSystemManager2faPin);
router.post('/disable-2fa', disableSystemManager2fa);
router.get('/2fa-status', getSystemManager2faStatus);

// 2FA upravljanje za druge System Manager-e (samo Global SM)
router.post('/enable-2fa-for-user', enableSystemManager2faForUser);
router.post('/disable-2fa-for-user', disableSystemManager2faForUser);

// Trusted devices rute
router.get('/trusted-devices', getSystemManagerTrustedDevices);
router.delete('/trusted-devices/:deviceId', removeSystemManagerTrustedDevice);
router.get('/trusted-devices-settings', getSystemManagerTrustedDevicesSettings);
router.put('/trusted-devices-settings', updateSystemManagerTrustedDevicesSettings);
router.get('/organizations/:organizationId/trusted-devices-settings', getOrganizationTrustedDevicesSettings);
router.put('/organizations/:organizationId/trusted-devices-settings', updateOrganizationTrustedDevicesSettings);

// Napomena: za dohvat profila trenutnog managera koristimo rutu '/me' ispod

// Rute za upravljanje system managerima
router.post('/create', systemManagerController.createSystemManager);
router.get('/all', systemManagerController.getAllSystemManagers);

// Ruta za dohvat statistika dashboarda
router.get('/dashboard/stats', systemManagerController.getDashboardStats);

// Rute za sistemske postavke (mogu raditi za Global i Org SM)
router.get('/settings', optionalTenantMiddleware, getSystemSettings);
router.put('/settings', optionalTenantMiddleware, updateSystemSettings);

// Rute za upravljanje ovlastima članova
router.get('/members-with-permissions', systemManagerController.getMembersWithPermissions);
router.get('/members-without-permissions', systemManagerController.getMembersWithoutPermissions);
router.get('/member-permissions/:memberId', systemManagerController.getMemberPermissions);
router.post('/update-permissions', systemManagerController.updateMemberPermissions);
router.delete('/member-permissions/:memberId', systemManagerController.removeMemberPermissions);

// Rute za upravljanje članovima (System Manager)
router.get('/members', systemManagerController.getAllMembers);
router.delete('/members/:memberId', systemManagerController.deleteMember);

// Rute za upravljanje članovima sa statusom 'pending'
router.get('/pending-members', systemManagerController.getPendingMembers);
router.post('/assign-password', systemManagerController.assignPasswordToMember);
router.post('/assign-role', systemManagerController.assignRoleToMember);

// Ruta za dohvat profila trenutnog managera
router.get('/me', systemManagerController.getCurrentSystemManager);

// Rute za upravljanje sistemskim zdravljem
// router.get('/system-health', systemManagerController.getSystemHealth);
// router.post('/system-backup', systemManagerController.createSystemBackup);
// router.post('/system-restore', systemManagerController.restoreSystemBackup);

// --- HOLIDAY MANAGEMENT (org-specific, trebaju tenant context) ---
router.get('/holidays', tenantMiddleware, holidayController.getAllHolidays);

// --- NAGER.DATE API INTEGRATION ---
// VAŽNO: Specifične rute MORAJU biti prije generičkih s parametrima!
// Dohvaća dostupne države iz Nager.Date API-ja (globalni podaci, ne treba tenant)
router.get('/holidays/countries', optionalTenantMiddleware, holidayController.getAvailableCountries);

// Sinkronizira praznike s Nager.Date API-jem
router.post('/holidays/sync-nager', tenantMiddleware, holidayController.syncHolidaysFromNagerDate);

// Seed default hrvatski praznici za godinu (lokalni fallback)
router.post('/holidays/seed', tenantMiddleware, holidayController.seedDefaultHolidays);

// Brisanje svih praznika za godinu
router.delete('/holidays/year/:year', tenantMiddleware, holidayController.deleteHolidaysForYear);

// Generičke rute s parametrima na kraju
router.get('/holidays/:year', tenantMiddleware, holidayController.getHolidaysForYear);
router.post('/holidays', tenantMiddleware, holidayController.createHoliday);
router.put('/holidays/:id', tenantMiddleware, holidayController.updateHoliday);
router.delete('/holidays/:id', tenantMiddleware, holidayController.deleteHoliday);

// --- DUTY CALENDAR SETTINGS (org-specific, trebaju tenant context) ---
router.get('/duty-settings', optionalTenantMiddleware, getDutySettings);
router.put('/duty-settings', optionalTenantMiddleware, updateDutySettings);

// --- ORGANIZATION MANAGEMENT ---
// Sve organization rute su već zaštićene s authMiddleware i requireSystemManager
router.use('/organizations', organizationRoutes);

export default router;
