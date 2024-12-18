import memberMessageRepository, { MemberMessage, MemberMessageWithSender } from '../repositories/member.message.repository.js';

const messageService = {
    async createMessage(memberId: number, messageText: string): Promise<MemberMessage> {
        return await memberMessageRepository.create(memberId, messageText);
    },

    async getAdminMessages(): Promise<MemberMessageWithSender[]> {
        return await memberMessageRepository.getAllForAdmin();
    },

    async getMemberMessages(memberId: number): Promise<MemberMessage[]> {
        return await memberMessageRepository.getByMemberId(memberId);
    },

    async markMessageAsRead(messageId: number): Promise<void> {
        await memberMessageRepository.markAsRead(messageId);
    },

    async archiveMessage(messageId: number): Promise<void> {
        await memberMessageRepository.archiveMessage(messageId);
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