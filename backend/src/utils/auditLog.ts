import prisma from './prisma';

interface AuditLogData {
  action: string;
  performedBy: number | null;
  details: string;
  ipAddress: string;
  status?: string;
  affectedMember?: number | null;
}

export const createAuditLog = async (data: AuditLogData) => {
  await prisma.auditLog.create({
    data: {
      action_type: data.action,
      performed_by: data.performedBy,
      action_details: data.details,
      ip_address: data.ipAddress,
      status: data.status || 'completed',
      affected_member: data.affectedMember
    }
  });
};