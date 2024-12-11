// backend/src/services/audit.service.ts
import auditRepository, { AuditLog } from '../repositories/audit.repository.js';
import { Request } from 'express';

const auditService = {
    async logAction(
        actionType: string,
        performedBy: number,
        details: string,
        req: Request,
        status: string = 'success',
        affectedMember?: number
    ): Promise<void> {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        
        await auditRepository.create({
            action_type: actionType,
            performed_by: performedBy,
            action_details: details,
            ip_address: ipAddress,
            status,
            affected_member: affectedMember
        });
    },

    async getAllLogs(): Promise<AuditLog[]> {
        return await auditRepository.getAll();
    },

    async getMemberLogs(memberId: number): Promise<AuditLog[]> {
        return await auditRepository.getByMemberId(memberId);
    }
};

export default auditService;