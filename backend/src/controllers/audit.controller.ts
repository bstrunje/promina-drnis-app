// backend/src/controllers/audit.controller.ts
import { Request, Response, NextFunction } from 'express';
import auditService from '../services/audit.service.js';
import { tBackend } from '../utils/i18n.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';

const auditController = {
    async getAllLogs(req: Request, res: Response, _next: NextFunction): Promise<void> {
        try {
            const _locale = req.locale || 'hr';
            
            // Paginacija parametri
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            
            // Dohvati organization_id za filtriranje
            let organizationId: number | null = null;
            try {
                organizationId = getOrganizationId(req);
            } catch (_error) {
                // Global Manager ili nema organizacije - dohvati sve
            }
            
            const result = await auditService.getPaginatedAuditLogs(organizationId, page, limit);
            
            res.json({
                logs: result.logs,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
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