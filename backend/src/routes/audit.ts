import express from 'express';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import auditController from '../controllers/audit.controller.js';

const router = express.Router();

router.get('/logs', authMiddleware, roles.requireSuperUser, auditController.getAllLogs);
router.get('/logs/:memberId', authMiddleware, roles.requireSuperUser, auditController.getMemberLogs);

export default router;