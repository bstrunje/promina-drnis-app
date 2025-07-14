import { PerformerType } from '@prisma/client';
import prisma from './prisma.js';

interface AuditLogData {
  action: string;
  performedBy: number | null;
  performer_type?: PerformerType;
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
      performer_type: data.performer_type,
      action_details: data.details,
      ip_address: data.ipAddress,
      status: data.status || 'completed',
      affected_member: data.affectedMember
    }
  });
};