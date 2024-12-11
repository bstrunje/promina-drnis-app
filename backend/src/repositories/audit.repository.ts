// backend/src/repositories/audit.repository.ts
import db from '../utils/db.js';

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

const auditRepository = {
    async create(log: Omit<AuditLog, 'log_id' | 'created_at'>): Promise<void> {
        await db.query(
            `INSERT INTO audit_logs 
            (action_type, performed_by, action_details, ip_address, status, affected_member)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [log.action_type, log.performed_by, log.action_details, 
             log.ip_address, log.status, log.affected_member]
        );
    },

    async getAll(): Promise<AuditLog[]> {
        const result = await db.query<AuditLog>(`
            SELECT l.*, 
                   m1.full_name as performer_name,
                   m2.full_name as affected_name
            FROM audit_logs l
            LEFT JOIN members m1 ON l.performed_by = m1.member_id
            LEFT JOIN members m2 ON l.affected_member = m2.member_id
            ORDER BY created_at DESC
        `);
        return result.rows;
    },

    async getByMemberId(memberId: number): Promise<AuditLog[]> {
        const result = await db.query<AuditLog>(
            `SELECT * FROM audit_logs WHERE performed_by = $1 OR affected_member = $1
             ORDER BY created_at DESC`,
            [memberId]
        );
        return result.rows;
    }
};

export default auditRepository;