import { Request, Response } from 'express';
import permissionsService from '../services/permissions.service.js';
import auditService from '../services/audit.service.js';
import type { DatabaseUser } from '../middleware/authMiddleware.js';

interface AuthRequest extends Request {
    user?: DatabaseUser;
}

const isDev = process.env.NODE_ENV === 'development';

export const permissionsController = {
    async getAdminPermissions(req: AuthRequest, res: Response) {
        try {
            const memberId = parseInt(req.params.memberId);
            if (isDev) console.log('Getting permissions for member:', memberId); // Debug log
            
            if (req.user?.role_name !== 'member_superuser' && req.user?.id !== memberId) {
                return res.status(403).json({ code: 'PERM_FORBIDDEN', message: 'Forbidden' });
            }

            const permissions = await permissionsService.getAdminPermissions(memberId);
            if (isDev) console.log('Found permissions:', permissions); // Debug log
            res.json(permissions);
        } catch (error) {
            console.error('Error fetching admin permissions:', error);
            res.status(500).json({ code: 'PERM_FETCH_FAILED', message: 'Failed to fetch permissions' });
        }
    },

    async updateAdminPermissions(req: AuthRequest, res: Response) {
        try {
            const memberId = parseInt(req.params.memberId);
            const grantedBy = req.user?.id;
            
            if (!grantedBy) {
                return res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
            }

            await permissionsService.updateAdminPermissions(
                memberId,
                req.body.permissions,
                grantedBy
            );

            await auditService.logAction(
                'UPDATE_ADMIN_PERMISSIONS',
                grantedBy,
                `Updated permissions for member ${memberId}`,
                req,
                'success',
                memberId
                // performer_type se neće prosljeđivati - auditService će koristiti getPerformerType
            );

            res.json({ message: 'Permissions updated successfully' });
        } catch (error) {
            console.error('Error updating admin permissions:', error);
            res.status(500).json({ code: 'PERM_UPDATE_FAILED', message: 'Failed to update permissions' });
        }
    }
};

export default permissionsController;
