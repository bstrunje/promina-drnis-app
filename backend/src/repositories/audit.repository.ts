import prisma from '../utils/prisma.js';

export interface AuditLog {
    log_id: number;
    action_type: string;
    performed_by: number;
    action_details: string;
    ip_address: string;
    created_at: Date;
    status: string;
    affected_member?: number;
}

interface RawAuditLogResult {
    log_id: number;
    action_type: string;
    performed_by: number;
    action_details: string;
    ip_address: string;
    created_at: Date;
    status: string;
    affected_member: number | null;
    performer_name?: string;
    affected_name?: string;
}

const auditRepository = {
    async create(data: Omit<AuditLog, 'log_id' | 'created_at'>) {
        const result = await prisma.$queryRaw<RawAuditLogResult[]>`
            INSERT INTO audit_logs (
                action_type, 
                performed_by, 
                action_details, 
                ip_address, 
                status, 
                affected_member
            ) VALUES (
                ${data.action_type},
                ${data.performed_by},
                ${data.action_details},
                ${data.ip_address},
                ${data.status || 'completed'},
                ${data.affected_member}
            ) RETURNING *;
        `;
        
        return mapPrismaToAuditLog(result[0]);
    },

    async getAll(): Promise<AuditLog[]> {
        const results = await prisma.$queryRaw<RawAuditLogResult[]>`
            SELECT al.*, 
                   m1.full_name as performer_name,
                   m2.full_name as affected_name
            FROM audit_logs al
            LEFT JOIN members m1 ON al.performed_by = m1.member_id
            LEFT JOIN members m2 ON al.affected_member = m2.member_id
            ORDER BY al.created_at DESC
        `;

        return results.map(mapPrismaToAuditLog);
    },

    async getByMemberId(memberId: number): Promise<AuditLog[]> {
        const results = await prisma.$queryRaw<RawAuditLogResult[]>`
            SELECT * FROM audit_logs
            WHERE performed_by = ${memberId}
               OR affected_member = ${memberId}
            ORDER BY created_at DESC
        `;

        return results.map(mapPrismaToAuditLog);
    }
};

const mapPrismaToAuditLog = (raw: RawAuditLogResult): AuditLog => ({
    log_id: raw.log_id,
    action_type: raw.action_type,
    performed_by: raw.performed_by,
    action_details: raw.action_details,
    ip_address: raw.ip_address,
    created_at: raw.created_at,
    status: raw.status,
    affected_member: raw.affected_member || undefined
});

export default auditRepository;