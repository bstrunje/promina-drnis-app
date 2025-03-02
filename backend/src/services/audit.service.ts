// backend/src/services/audit.service.ts
import { Request } from 'express';
import auditRepository, { AuditLog } from '../repositories/audit.repository.js';
import { DatabaseUser } from '../middleware/authMiddleware.js';

const auditService = {
    async logAction(
        action_type: string,
        performed_by: number | null,
        action_details: string,
        req: Request,
        status: string = 'success',
        affected_member?: number
    ): Promise<void> {
        try {
            const ip_address = req.ip || req.socket.remoteAddress || 'unknown';
            
            // Fix: Pass individual arguments instead of an object
            await auditRepository.create(
                action_type,
                performed_by,
                action_details,
                ip_address,
                status,
                affected_member
            );
        } catch (error) {
            console.error('Error logging audit action:', error);
            // Don't throw the error - just log it and continue
        }
    },

    async getAllLogs(): Promise<AuditLog[]> {
        return await auditRepository.getAll();
    },

    async getMemberLogs(memberId: number): Promise<AuditLog[]> {
        return await auditRepository.getByMemberId(memberId);
    }
};

export default auditService;