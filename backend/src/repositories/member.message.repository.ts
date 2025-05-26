import prisma from '../utils/prisma.js';
import { mapToMemberMessage, mapToMemberMessageWithSender } from '../utils/memberMessageMapper.js';
import { getCurrentDate } from '../utils/dateUtils.js';

export interface MemberMessage {
    message_id: number;
    member_id: number | null;
    message_text: string;
    created_at: Date;
    read_at: Date | null;
    status: 'unread' | 'read' | 'archived';
    sender_id: number | null;
    recipient_id: number | null;
    recipient_type: 'member_administrator' | 'member' | 'group' | 'all';
    sender_type: 'member' | 'member_administrator' | 'member_superuser';
}

export interface MemberMessageWithSender extends MemberMessage {
    sender_name: string;
}

// Using shared prisma client

const memberMessageRepository = {
    async create(memberId: number, messageText: string): Promise<MemberMessage> {
        const raw = await prisma.memberMessage.create({ data: {
            member_id: memberId,
            message_text: messageText,
            sender_id: memberId,
            sender_type: 'member',
            recipient_type: 'member_administrator'
        }});
        return mapToMemberMessage(raw);
    },

    async createAdminMessage(
        senderId: number, 
        recipientId: number | null, 
        messageText: string, 
        recipientType: 'member' | 'group' | 'all' = 'member',
        senderType: 'member_administrator' | 'member_superuser' = 'member_administrator'
    ): Promise<MemberMessage> {
        const raw = await prisma.memberMessage.create({ data: {
            message_text: messageText,
            sender_id: senderId,
            sender_type: senderType,
            recipient_id: recipientId,
            recipient_type: recipientType
        }});
        return mapToMemberMessage(raw);
    },

    async getAllForAdmin(): Promise<MemberMessageWithSender[]> {
        const raws = await prisma.memberMessage.findMany({
            where: { recipient_type: { in: ['member_administrator', 'all'] } },
            include: { member: { select: { first_name: true, last_name: true } } },
            orderBy: { created_at: 'desc' }
        });
        return raws.map(mapToMemberMessageWithSender);
    },

    async getByMemberId(memberId: number): Promise<MemberMessage[]> {
        const raws = await prisma.memberMessage.findMany({
            where: {
                OR: [
                    { member_id: memberId, recipient_type: 'member_administrator' },
                    { recipient_id: memberId, recipient_type: 'member' },
                    { recipient_id: memberId, recipient_type: 'group' }
                ]
            },
            orderBy: { created_at: 'desc' }
        });
        return raws.map(mapToMemberMessage);
    },

    async getMessagesSentByAdmin(adminId: number): Promise<MemberMessageWithSender[]> {
        const raws = await prisma.memberMessage.findMany({
            where: { sender_id: adminId, sender_type: { in: ['member_administrator', 'member_superuser'] } },
            orderBy: { created_at: 'desc' }
        });
        const recipientIds = raws.map(r => r.recipient_id).filter(id => id !== null) as number[];
        const membersMap = new Map<number, string>();
        if (recipientIds.length) {
            const members = await prisma.member.findMany({
                where: { member_id: { in: recipientIds } },
                select: { member_id: true, first_name: true, last_name: true }
            });
            members.forEach(m => membersMap.set(m.member_id, `${m.first_name} ${m.last_name}`));
        }
        return await Promise.all(raws.map(async raw => {
            const base = mapToMemberMessage(raw);
            const sender_name = raw.recipient_id
                ? membersMap.get(raw.recipient_id) || 'Multiple Recipients'
                : raw.recipient_type === 'all' ? 'All Members' : 'Multiple Recipients';
            return { ...base, sender_name };
        }));
    },

    async getMessagesByGroup(groupIds: number[]): Promise<MemberMessage[]> {
        if (!groupIds.length) return [];
        const raws = await prisma.memberMessage.findMany({
            where: { OR: [ { recipient_id: { in: groupIds } }, { recipient_type: 'all' } ] },
            orderBy: { created_at: 'desc' }
        });
        return raws.map(mapToMemberMessage);
    },

    async getMessagesForAllMembers(): Promise<MemberMessage[]> {
        const raws = await prisma.memberMessage.findMany({
            where: { recipient_type: 'all' },
            orderBy: { created_at: 'desc' }
        });
        return raws.map(mapToMemberMessage);
    },

    async markAsRead(messageId: number): Promise<void> {
        await prisma.memberMessage.update({ where: { message_id: messageId }, data: { status: 'read', read_at: getCurrentDate() }});
    },

    async archiveMessage(messageId: number): Promise<void> {
        await prisma.memberMessage.update({ where: { message_id: messageId }, data: { status: 'archived' }});
    },

    async deleteMessage(messageId: number): Promise<void> {
        await prisma.memberMessage.delete({ where: { message_id: messageId }});
    },

    async deleteAllMessages(): Promise<void> {
        await prisma.memberMessage.deleteMany();
    },

    async messageExists(messageId: number): Promise<boolean> {
        const count = await prisma.memberMessage.count({ where: { message_id: messageId }});
        return count > 0;
    }
};

export default memberMessageRepository;