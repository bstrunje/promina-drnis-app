// shared/types/audit.ts
export interface AuditLog {
    log_id: number;
    action_type: string;
    performed_by: number;
    performer_name: string;
    action_details: string;
    ip_address: string;
    created_at: string;
    status: string;
    affected_member?: number;
    affected_name?: string;
}