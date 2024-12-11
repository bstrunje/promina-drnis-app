// backend/src/controllers/audit.controller.ts
import { Request, Response } from 'express';
import auditService from '../services/audit.service.js';

const auditController = {
    async getAllLogs(req: Request, res: Response): Promise<void> {
        try {
            const logs = await auditService.getAllLogs();
            res.json(logs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({ message: 'Error fetching audit logs' });
        }
    },

    async getMemberLogs(req: Request, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);
            const logs = await auditService.getMemberLogs(memberId);
            res.json(logs);
        } catch (error) {
            console.error('Error fetching member logs:', error);
            res.status(500).json({ message: 'Error fetching member logs' });
        }
    }
};

export default auditController;