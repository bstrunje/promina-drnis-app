import express, { Response } from 'express';
import permissionsController from '../controllers/permissions.controller.js';
import { authMiddleware as authenticateToken, checkRole } from '../middleware/authMiddleware.js';
import type { Request } from 'express';
import { DatabaseUser } from '../middleware/authMiddleware.js';

interface AuthRequest extends Request {
    user?: DatabaseUser;
}

const router = express.Router();

router.get(
    '/permissions/:memberId',
    authenticateToken,
    (req: AuthRequest, res: Response) => permissionsController.getAdminPermissions(req, res)
);

router.put(
    '/permissions/:memberId',
    authenticateToken,
    checkRole(['superuser']),
    permissionsController.updateAdminPermissions
);

export default router;
