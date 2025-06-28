import { PrismaClient } from '@prisma/client';
import { PerformerType } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLog {
    log_id: number;
    action_type: string;
    performed_by: number | null;
    action_details: string;
    ip_address: string;
    created_at: Date;
    status: string;
    affected_member?: number;
    performer_name?: string;
    affected_name?: string;
    performer_type?: PerformerType | null;
}

interface RawAuditLogResult {
    log_id: number;
    action_type: string;
    performed_by: number | null;
    action_details: string;
    ip_address: string;
    created_at: Date;
    status: string;
    affected_member: number | null;
    performer_name?: string;
    affected_name?: string;
    performer_type?: PerformerType | null;
}

const auditRepository = {
    async create(
        action_type: string,
        performed_by: number | null,
        action_details: string,
        ip_address: string,
        status: string = 'success',
        affected_member?: number,
        performer_type?: PerformerType | null
    ): Promise<void> {
        try {
            // Eksplicitno pretvaranje enuma u string ili null
            const performerTypeString = performer_type ? performer_type.toString() : null;

            await prisma.$executeRaw`
                INSERT INTO audit_logs 
                (action_type, performed_by, performer_type, action_details, ip_address, status, affected_member) 
                VALUES (${action_type}, ${performed_by}, CAST(${performerTypeString} AS "PerformerType"), ${action_details}, ${ip_address}, ${status}, ${affected_member || null})
            `;
        } catch (error) {
            console.error('GREŠKA PRILIKOM KREIRANJA AUDIT LOGA:', error);
            // U produkciji možda ne želite baciti grešku koja će srušiti zahtjev
            // Ovisno o važnosti logiranja
        }
    },

    async getAll(): Promise<AuditLog[]> {
        const results = await prisma.$queryRaw<RawAuditLogResult[]>`
            SELECT al.*,
                   CASE 
                     WHEN al.performer_type = 'SYSTEM_MANAGER' THEN sm.display_name
                     ELSE m1.full_name 
                   END as performer_name,
                   m2.full_name as affected_name
            FROM audit_logs al
            LEFT JOIN members m1 ON al.performed_by = m1.member_id AND (al.performer_type = 'MEMBER' OR al.performer_type IS NULL)
            LEFT JOIN system_manager sm ON al.performed_by = sm.id AND al.performer_type = 'SYSTEM_MANAGER'
            LEFT JOIN members m2 ON al.affected_member = m2.member_id
            ORDER BY al.created_at DESC
        `;

        return results.map(mapPrismaToAuditLog);
    },

    async getByMemberId(memberId: number): Promise<AuditLog[]> {
        const results = await prisma.$queryRaw<RawAuditLogResult[]>`
            SELECT al.*,
                   CASE 
                     WHEN al.performer_type = 'SYSTEM_MANAGER' THEN sm.display_name
                     ELSE m1.full_name 
                   END as performer_name,
                   m2.full_name as affected_name
            FROM audit_logs al
            LEFT JOIN members m1 ON al.performed_by = m1.member_id AND (al.performer_type = 'MEMBER' OR al.performer_type IS NULL)
            LEFT JOIN system_manager sm ON al.performed_by = sm.id AND al.performer_type = 'SYSTEM_MANAGER'
            LEFT JOIN members m2 ON al.affected_member = m2.member_id
            WHERE (al.performed_by = ${memberId} AND (al.performer_type = 'MEMBER' OR al.performer_type IS NULL))
               OR al.affected_member = ${memberId}
            ORDER BY al.created_at DESC
        `;

        return results.map(mapPrismaToAuditLog);
    },
};

function mapPrismaToAuditLog(raw: RawAuditLogResult): AuditLog {
    return {
        log_id: raw.log_id,
        action_type: raw.action_type,
        performed_by: raw.performed_by,
        action_details: raw.action_details,
        ip_address: raw.ip_address,
        created_at: raw.created_at,
        status: raw.status,
        affected_member: raw.affected_member || undefined,
        performer_name: raw.performer_name || undefined,
        affected_name: raw.affected_name || undefined,
        performer_type: raw.performer_type || undefined
    };
}

export default auditRepository;