// routes/pwa.routes.ts
import express from 'express';
import * as pwaController from '../controllers/pwa.controller.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';

const router = express.Router();

/**
 * Dinamički PWA manifest za svaku organizaciju
 * GET /api/manifest?tenant=promina
 */
router.get('/manifest', tenantMiddleware, pwaController.getManifest);

export default router;
