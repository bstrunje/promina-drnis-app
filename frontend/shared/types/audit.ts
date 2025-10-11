// shared/types/audit.ts
export interface AuditLog {
    log_id: number;
    organization_id?: number | null;
    action_type: string;
    performed_by: number;
    performer_name: string;
    performer_type?: string;
    action_details: string;
    ip_address: string;
    created_at: string;
    status: string;
    affected_member?: number;
    affected_name?: string;
    affected?: {
        member_id: number;
        first_name: string;
        last_name: string;
    };
}