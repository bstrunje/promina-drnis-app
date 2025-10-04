// backend/src/routes/organization.routes.ts
import express from 'express';
import multer from 'multer';
import * as organizationController from '../controllers/organization.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import { 
  requireGlobalSystemManager, 
  requireOrganizationAccess 
} from '../middleware/systemManager.middleware.js';

const router = express.Router();

// Multer konfiguracija za logo upload (priprema za buduću implementaciju)
const _upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPEG images are allowed'));
    }
  }
});

// Sve rute zahtijevaju System Manager autentikaciju
router.use(authMiddleware, roles.requireSystemManager);

// ============================================================================
// JAVNE RUTE (za sve System Manager-e)
// ============================================================================

/**
 * Provjera dostupnosti subdomene
 * GET /api/system-manager/organizations/check-subdomain?subdomain=velebit
 */
router.get('/check-subdomain', organizationController.checkSubdomainAvailability);

// ============================================================================
// GLOBALNI SYSTEM MANAGER RUTE
// ============================================================================

/**
 * Kreiranje nove organizacije
 * POST /api/system-manager/organizations
 * Body: { name, subdomain, email, sm_username, sm_email, sm_password, ... }
 * 
 * SAMO globalni System Manager (organization_id = null)
 */
router.post('/', requireGlobalSystemManager, organizationController.createOrganization);

/**
 * Dohvat svih organizacija
 * GET /api/system-manager/organizations
 * 
 * SAMO globalni System Manager
 */
router.get('/', requireGlobalSystemManager, organizationController.getAllOrganizations);

/**
 * Brisanje organizacije
 * DELETE /api/system-manager/organizations/:id
 * 
 * SAMO globalni System Manager
 */
router.delete('/:id', requireGlobalSystemManager, organizationController.deleteOrganization);

// ============================================================================
// RUTE S PROVJEROM PRISTUPA
// ============================================================================

/**
 * Dohvat pojedinačne organizacije
 * GET /api/system-manager/organizations/:id
 * 
 * - Globalni SM: može vidjeti sve organizacije
 * - Org-specific SM: može vidjeti samo svoju organizaciju
 */
router.get('/:id', requireOrganizationAccess, organizationController.getOrganizationById);

/**
 * Ažuriranje organizacije
 * PUT /api/system-manager/organizations/:id
 * Body: { name, email, primary_color, ... }
 * 
 * - Globalni SM: može ažurirati sve organizacije
 * - Org-specific SM: može ažurirati samo svoju organizaciju
 */
router.put('/:id', requireOrganizationAccess, organizationController.updateOrganization);

export default router;
