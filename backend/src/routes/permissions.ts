// backend/src/routes/permissions.ts
import express from 'express';
import { permissionsController } from '../controllers/permissions.controller.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import permissionsService from '../services/permissions.service.js';

const router = express.Router();

// Dohvati sve članove s permissions (samo superuser)
router.get('/', authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const members = await permissionsService.getAllMembersWithPermissions();
    res.json(members);
  } catch (error) {
    console.error('Greška kod dohvata članova s permissions:', error);
    res.status(500).json({ message: 'Neuspješan dohvat članova s permissions' });
  }
});

// Dohvati permissions za člana (samo superuser ili vlasnik)
router.get('/:memberId', authenticateToken, permissionsController.getAdminPermissions);

// Ažuriraj permissions (samo superuser)
router.put('/:memberId', authenticateToken, roles.requireSuperUser, permissionsController.updateAdminPermissions);

export default router;