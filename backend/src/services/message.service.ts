import memberMessageRepository, { TransformedMessage } from '../repositories/member.message.repository.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { Request } from 'express';

const messageService = {
    async createMessage(req: Request, memberId: number, messageText: string): Promise<TransformedMessage> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.create(organizationId, memberId, messageText);
    },

    async createAdminMessage({
        req,
        senderId,
        messageText,
        recipientType = 'member',
        senderType = 'member_administrator',
        recipientId, // Koristi se samo ako je recipientType 'member'
        recipientMemberIds, // Koristi se samo ako je recipientType 'group'
    }: {
        req: Request;
        senderId: number;
        messageText: string;
        recipientType?: 'member' | 'group' | 'all';
        senderType?: 'member_administrator' | 'member_superuser';
        recipientId?: number;
        recipientMemberIds?: number[];
    }): Promise<TransformedMessage> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.createAdminMessage({
            organizationId,
            senderId,
            messageText,
            recipientType,
            senderType,
            recipientId,
            recipientMemberIds,
        });
    },

    async getAdminMessages(req: Request, currentMemberId: number): Promise<TransformedMessage[]> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.getAllForAdmin(organizationId, currentMemberId);
    },

    async getMessagesSentByAdmin(req: Request, adminId: number): Promise<TransformedMessage[]> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.getMessagesSentByAdmin(organizationId, adminId);
    },

    async getMemberMessages(req: Request, memberId: number): Promise<TransformedMessage[]> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.getByMemberId(organizationId, memberId);
    },

    async getAdHocGroupMessagesForMember(req: Request, currentMemberId: number): Promise<TransformedMessage[]> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.getAdHocGroupMessagesForMember(organizationId, currentMemberId);
    },

    async getMessagesForAllMembers(req: Request, currentMemberId: number): Promise<TransformedMessage[]> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.getMessagesForAllMembers(organizationId, currentMemberId);
    },

    async getMessageById(req: Request, messageId: number): Promise<TransformedMessage | null> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.findById(organizationId, messageId);
    },

    async markMessageAsRead(messageId: number, memberId: number): Promise<number> {
        return await memberMessageRepository.markAsRead(messageId, memberId);
    },

    async archiveMessage(messageId: number, memberId: number): Promise<void> {
        await memberMessageRepository.archiveMessage(messageId, memberId);
    },

    async deleteMessage(messageId: number): Promise<void> {
        const exists = await memberMessageRepository.messageExists(messageId);
        if (!exists) {
            throw new Error('Message not found');
        }
        await memberMessageRepository.deleteMessage(messageId);
    },

    async deleteAllMessages(): Promise<void> {
        await memberMessageRepository.deleteAllMessages();
    },

    async messageExists(messageId: number): Promise<boolean> {
        return await memberMessageRepository.messageExists(messageId);
    },
    
    async countUnreadMessages(req: Request, memberId: number): Promise<number> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.countUnreadMessages(organizationId, memberId);
    },

    async getSentMessagesByMemberId(req: Request, memberId: number): Promise<TransformedMessage[]> {
        const organizationId = getOrganizationId(req);
        return await memberMessageRepository.getSentMessagesByMemberId(organizationId, memberId);
    }
};

export default messageService;