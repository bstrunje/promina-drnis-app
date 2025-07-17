// backend/src/services/audit.service.ts
import { Request } from 'express';
import auditRepository, { AuditLog } from '../repositories/audit.repository.js';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import { PerformerType } from '@prisma/client';

interface LogEventParams {
    event_type: string;
    user_id: number | null;
    user_type: string | null;
    ip_address: string;
    details: Record<string, any>;
}

interface AuditLogDetails {
    user_id: number | null;
}

const auditService = {
    async logAction(
        action_type: string,
        performed_by: number | null,
        action_details: string,
        req: Request | undefined,
        status: string = 'success',
        affected_member?: number,
        performer_type?: PerformerType
    ): Promise<void> {
        try {
            const ip_address = req ? (req.ip || req.socket.remoteAddress || 'unknown') : 'not available';
            
            await auditRepository.create(
                action_type,
                performed_by,
                action_details,
                ip_address,
                status,
                affected_member,
                performer_type
            );
        } catch (error) {
            console.error('Error logging audit action:', error);
            // Don't throw the error - just log it and continue
        }
    },

    // Nova metoda za logiranje događaja koristeći parametrizirani objekt
    async logEvent(params: LogEventParams): Promise<void> {
        try {
            const { event_type, user_id, details, ip_address } = params;
            
            // Pretvori detalje u string format
            const detailsStr = JSON.stringify(details);
            
            // Koristi direktno repository za stvaranje zapisa
            await auditRepository.create(
                event_type,
                user_id,
                detailsStr,
                ip_address,
                'success', // Pretpostavljeni status
                details.affected_member || null
            );
        } catch (error) {
            console.error('Error logging audit event:', error);
            // Ne bacaj grešku - samo je logiraj i nastavi
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