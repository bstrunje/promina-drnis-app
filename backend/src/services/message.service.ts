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
    }
};

export default messageService;