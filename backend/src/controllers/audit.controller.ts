// backend/src/controllers/audit.controller.ts
import { Request, Response, NextFunction } from 'express';
import auditService from '../services/audit.service.js';
import { tBackend } from '../utils/i18n.js';

const auditController = {
    async getAllLogs(req: Request, res: Response, _next: NextFunction): Promise<void> {
        try {
            const _locale = req.locale || 'hr';
            const logs = await auditService.getAllLogs();
            res.json(logs);
        } catch (error) {
            const locale = req.locale || 'hr';
            console.error('Error fetching audit logs:', error);
            res.status(500).json({ 
                code: 'AUDIT_FETCH_ERROR',
                message: tBackend('validations.audit_fetch_error', locale)
            });
        }
    },

    async getMemberLogs(req: Request, res: Response, _next: NextFunction): Promise<Response | void> {
        const locale = req.locale || 'hr';
        const memberId = parseInt(req.params.memberId);

        if (isNaN(memberId)) {
            return res.status(400).json({
                code: 'INVALID_MEMBER_ID',
                message: tBackend('validations.invalid_member_id', locale)
            });
        }

        try {
            const logs = await auditService.getMemberLogs(memberId);
            res.json(logs);
        } catch (error) {
            console.error('Error fetching member logs:', error);
            res.status(500).json({ 
                code: 'MEMBER_LOGS_FETCH_ERROR',
                message: tBackend('validations.member_logs_fetch_error', locale)
            });
        }
    }
};

export default auditController;