import memberMessageRepository, { TransformedMessage } from '../repositories/member.message.repository.js';

const messageService = {
    async createMessage(memberId: number, messageText: string): Promise<TransformedMessage> {
        return await memberMessageRepository.create(memberId, messageText);
    },

    async createAdminMessage({
        senderId,
        messageText,
        recipientType = 'member',
        senderType = 'member_administrator',
        recipientId, // Koristi se samo ako je recipientType 'member'
        recipientMemberIds, // Koristi se samo ako je recipientType 'group'
    }: {
        senderId: number;
        messageText: string;
        recipientType?: 'member' | 'group' | 'all';
        senderType?: 'member_administrator' | 'member_superuser';
        recipientId?: number;
        recipientMemberIds?: number[];
    }): Promise<TransformedMessage> {
        return await memberMessageRepository.createAdminMessage({
            senderId,
            messageText,
            recipientType,
            senderType,
            recipientId,
            recipientMemberIds,
        });
    },

    async getAdminMessages(currentMemberId: number): Promise<TransformedMessage[]> {
        return await memberMessageRepository.getAllForAdmin(currentMemberId);
    },

    async getMessagesSentByAdmin(adminId: number): Promise<TransformedMessage[]> {
        return await memberMessageRepository.getMessagesSentByAdmin(adminId);
    },

    async getMemberMessages(memberId: number): Promise<TransformedMessage[]> {
        return await memberMessageRepository.getByMemberId(memberId);
    },

    async getAdHocGroupMessagesForMember(currentMemberId: number): Promise<TransformedMessage[]> {
        return await memberMessageRepository.getAdHocGroupMessagesForMember(currentMemberId);
    },

    async getMessagesForAllMembers(currentMemberId: number): Promise<TransformedMessage[]> {
        return await memberMessageRepository.getMessagesForAllMembers(currentMemberId);
    },

    async getMessageById(messageId: number): Promise<TransformedMessage | null> {
        return await memberMessageRepository.findById(messageId);
    },

    async markMessageAsRead(messageId: number, memberId: number): Promise<void> {
        await memberMessageRepository.markAsRead(messageId, memberId);
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
    }
};

export default messageService;