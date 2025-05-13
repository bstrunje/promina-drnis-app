import { Prisma, MemberMessage as PrismaMemberMessage } from '@prisma/client';
import { MemberMessage, MemberMessageWithSender } from '../repositories/member.message.repository.js';

// Mapa raw Prisma MemberMessage na MemberMessage interfejs
export function mapToMemberMessage(raw: PrismaMemberMessage): MemberMessage {
    return {
        message_id: raw.message_id,
        member_id: raw.member_id ?? null,
        message_text: raw.message_text,
        created_at: raw.created_at as Date,
        read_at: raw.read_at ?? null,
        status: raw.status as MemberMessage['status'],
        sender_id: raw.sender_id ?? null,
        recipient_id: raw.recipient_id ?? null,
        recipient_type: raw.recipient_type as MemberMessage['recipient_type'],
        sender_type: raw.sender_type as MemberMessage['sender_type']
    };
}

// Mapa raw Prisma MemberMessage sa uključenim "member" objektom na MemberMessageWithSender
export function mapToMemberMessageWithSender(
    raw: Prisma.MemberMessageGetPayload<{ include: { member: { select: { first_name: true; last_name: true } } } }>
): MemberMessageWithSender {
    const base = mapToMemberMessage(raw as PrismaMemberMessage);
    // member relation guaranteed by include
    const first = raw.member?.first_name ?? '';
    const last = raw.member?.last_name ?? '';
    const senderName = (first || last) ? `${first} ${last}` : '';
    return { ...base, sender_name: senderName };
}
