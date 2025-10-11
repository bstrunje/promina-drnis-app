import { PerformerType, Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { Request } from 'express';

export interface AuditLog {
    log_id: number;
    action_type: string;
    performed_by: number | null;
    action_details: string;
    ip_address: string | null;
    created_at: Date | null;
    status: string | null;
    affected_member?: number | null;
    performer_name?: string | null;
    affected_name?: string | null;
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
        performer_type?: PerformerType | null,
        req?: Request,
        explicit_organization_id?: number | null
    ): Promise<void> {
        try {
            const finalPerformerType = performer_type;
            
            // Dohvati organization_id - prioritet ima explicit_organization_id
            let organizationId: number | null = null;
            
            if (explicit_organization_id !== undefined) {
                organizationId = explicit_organization_id;
                    } else if (req) {
                // Za System Manager-e, koristi organization_id iz user objekta
                if (req.user?.is_SystemManager && req.user.organization_id !== undefined) {
                    organizationId = req.user.organization_id;
                } else {
                    // Za članove, pokušaj dohvatiti iz tenant middleware-a
                    try {
                        organizationId = getOrganizationId(req);
                    } catch (_error) {
                    // Ako nema organizacije (Global Manager ili greška), ostavi null
                    }
                }
            }

            console.log('[AUDIT CREATE] Pokušaj kreiranja loga s podacima:', {
                organization_id: organizationId,
                action_type,
                performed_by,
                action_details,
                ip_address,
                status,
                affected_member: affected_member || null,
                performer_type: finalPerformerType || null,
            });

            const createdLog = await prisma.auditLog.create({
                data: {
                    organization_id: organizationId,
                    action_type,
                    performed_by,
                    action_details,
                    ip_address,
                    status,
                    affected_member: affected_member || null,
                    performer_type: finalPerformerType || null,
                },
            });

            console.log('[AUDIT CREATE] Log uspješno kreiran, ID:', createdLog.log_id);
            

        } catch (error) {
            console.error('GREŠKA PRILIKOM KREIRANJA AUDIT LOGA:', error);
            // U produkciji možda ne želite baciti grešku koja će srušiti zahtjev
            // Ovisno o važnosti logiranja
        }
    },

    async getAll(where: Prisma.AuditLogWhereInput = {}, skip: number = 0, take: number = 50): Promise<AuditLog[]> {
        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip,
            take,
            include: { affected: { select: { full_name: true } } },
        });

        const memberIds = logs
            .filter(log => log.performer_type === 'MEMBER' && log.performed_by)
            .map(log => log.performed_by as number);

        const systemManagerIds = logs
            .filter(log => log.performer_type === 'SYSTEM_MANAGER' && log.performed_by)
            .map(log => log.performed_by as number);

        const members = await prisma.member.findMany({
            where: { member_id: { in: [...new Set(memberIds)] } },
            select: { member_id: true, full_name: true },
        });

        const systemManagers = await prisma.systemManager.findMany({
            where: { id: { in: [...new Set(systemManagerIds)] } },
            select: { id: true, display_name: true, username: true },
        });

        const memberMap = new Map(members.map(m => [m.member_id, m.full_name]));
        const systemManagerMap = new Map(systemManagers.map(sm => [sm.id, sm.display_name || sm.username]));

        return logs.map(log => ({
            ...log,
            performer_name: log.performer_type === 'MEMBER'
                ? memberMap.get(log.performed_by as number)
                : systemManagerMap.get(log.performed_by as number),
            affected_name: log.affected?.full_name,
        }));
    },

    async getByMemberId(memberId: number): Promise<AuditLog[]> {
        const logs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    { performed_by: memberId, performer_type: 'MEMBER' },
                    { affected_member: memberId },
                ],
            },
            orderBy: { created_at: 'desc' },
            include: { affected: { select: { full_name: true } } },
        });

        const memberIds = logs
            .filter(log => log.performer_type === 'MEMBER' && log.performed_by)
            .map(log => log.performed_by as number);

        const systemManagerIds = logs
            .filter(log => log.performer_type === 'SYSTEM_MANAGER' && log.performed_by)
            .map(log => log.performed_by as number);

        const members = await prisma.member.findMany({
            where: { member_id: { in: [...new Set(memberIds)] } },
            select: { member_id: true, full_name: true },
        });

        const systemManagers = await prisma.systemManager.findMany({
            where: { id: { in: [...new Set(systemManagerIds)] } },
            select: { id: true, display_name: true, username: true },
        });

        const memberMap = new Map(members.map(m => [m.member_id, m.full_name]));
        const systemManagerMap = new Map(systemManagers.map(sm => [sm.id, sm.display_name || sm.username]));

        return logs.map(log => ({
            ...log,
            performer_name: log.performer_type === 'MEMBER'
                ? memberMap.get(log.performed_by as number)
                : systemManagerMap.get(log.performed_by as number),
            affected_name: log.affected?.full_name,
        }));
    },
};

export default auditRepository;