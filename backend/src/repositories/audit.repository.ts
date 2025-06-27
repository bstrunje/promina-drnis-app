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
    performer_name?: string;
    affected_name?: string;
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
    async create(
        action_type: string,
        performed_by: number | null,
        action_details: string,
        ip_address: string,
        status: string = 'success',
        affected_member?: number
    ): Promise<void> {
        try {
            // If performed_by is null, there's no need to check if user exists
            if (performed_by === null) {
                // Use Prisma's properly formatted executeRaw with parameters
                await prisma.$executeRaw`
                    INSERT INTO audit_logs 
                    (action_type, performed_by, action_details, ip_address, status, affected_member) 
                    VALUES (${action_type}, NULL, ${action_details}, ${ip_address}, ${status}, ${affected_member || null})
                `;
                return;
            }

            // Use Prisma's proper method to check if the user exists
            const userCount = await prisma.$queryRaw<[{count: number}]>`
                SELECT COUNT(*) as count FROM members WHERE member_id = ${performed_by}
            `;
            
            // If user doesn't exist, use NULL for performed_by
            const userExists = userCount[0]?.count > 0;
            
            // Insert the audit log record using proper syntax
            await prisma.$executeRaw`
                INSERT INTO audit_logs 
                (action_type, performed_by, action_details, ip_address, status, affected_member) 
                VALUES (${action_type}, ${userExists ? performed_by : null}, ${action_details}, ${ip_address}, ${status}, ${affected_member || null})
            `;
        } catch (error) {
            console.error('Error creating audit log:', error);
            // Don't throw the error - just log it and continue
        }
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
            SELECT al.*,
                   m1.full_name as performer_name,
                   m2.full_name as affected_name
            FROM audit_logs al
            LEFT JOIN members m1 ON al.performed_by = m1.member_id
            LEFT JOIN members m2 ON al.affected_member = m2.member_id
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
    affected_member: raw.affected_member || undefined,
    performer_name: raw.performer_name || undefined,
    affected_name: raw.affected_name || undefined
});

export default auditRepository;