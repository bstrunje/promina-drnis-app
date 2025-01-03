import express from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Settings routes - restricted to superuser only
router.get('/', authMiddleware, roles.requireSuperUser, getSettings);
router.put('/', authMiddleware, roles.requireSuperUser, updateSettings);

export default router;