// backend/src/services/audit.service.ts
import { Request } from 'express';
import auditRepository, { AuditLog } from '../repositories/audit.repository.js';
import { PerformerType } from '@prisma/client';

const isDev = process.env.NODE_ENV === 'development';

interface LogEventParams {
    event_type: string;
    user_id: number | null;
    user_type: string | null;
    ip_address: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: Record<string, any>;
    performer_type?: PerformerType;
}

// Helper funkcija za određivanje performer_type-a
function getPerformerType(req: Request | undefined): PerformerType | null {
    if (isDev) console.log('DEBUG getPerformerType - req?.user:', req?.user);
    
    if (!req?.user) {
        if (isDev) console.log('DEBUG getPerformerType - no req.user, returning null');
        return null;
    }
    
    // Ako je performer_type eksplicitno postavljen, koristi ga
    if (req.user.performer_type) {
        if (isDev) console.log('DEBUG getPerformerType - using explicit performer_type:', req.user.performer_type);
        return req.user.performer_type;
    }
    
    // Fallback logika na osnovu user_type ili is_SystemManager
    if (req.user.is_SystemManager || req.user.user_type === 'SystemManager') {
        if (isDev) console.log('DEBUG getPerformerType - detected SystemManager, returning SYSTEM_MANAGER');
        return PerformerType.SYSTEM_MANAGER;
    }
    
    if (req.user.user_type === 'member') {
        if (isDev) console.log('DEBUG getPerformerType - detected member, returning MEMBER');
        return PerformerType.MEMBER;
    }
    
    // Zadnji fallback - pokušaj na osnovu role
    if (req.user.role === 'SystemManager') {
        if (isDev) console.log('DEBUG getPerformerType - detected SystemManager role, returning SYSTEM_MANAGER');
        return PerformerType.SYSTEM_MANAGER;
    }
    
    // Ako ništa nije jasno, pretpostavi da je član
    if (isDev) console.log('DEBUG getPerformerType - fallback to MEMBER');
    return PerformerType.MEMBER;
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
            
            // Koristi helper funkciju ako performer_type nije postavljen ili je undefined/null
            const finalPerformerType = performer_type ?? getPerformerType(req);
            
            await auditRepository.create(
                action_type,
                performed_by,
                action_details,
                ip_address,
                status,
                affected_member,
                finalPerformerType
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
                details.affected_member || null,
                params.performer_type || null
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
export { getPerformerType };