import { Prisma, MemberMessage as PrismaMemberMessage } from '@prisma/client';
import { TransformedMessage } from '../repositories/member.message.repository.js';

// Tip koji proširuje TransformedMessage s poljima koja frontend očekuje
type ApiCompatibleMessage = TransformedMessage & {
    status?: 'unread' | 'read' | 'archived';
    read_at?: Date | null;
    read?: boolean; // Dodano za kompatibilnost s frontendom
};

// Mapa raw Prisma MemberMessage na TransformedMessage interfejs
export function mapToMemberMessage(raw: PrismaMemberMessage | TransformedMessage): ApiCompatibleMessage {
    const baseMessage = 'currentUserStatus' in raw 
        ? raw as TransformedMessage 
        : {
            message_id: raw.message_id,
            member_id: raw.member_id ?? null,
            message_text: raw.message_text,
            created_at: raw.created_at as Date,
            sender_id: raw.sender_id ?? null,
            recipient_id: raw.recipient_id ?? null,
            recipient_type: raw.recipient_type,
            sender_type: raw.sender_type,
            currentUserStatus: undefined,
            currentUserReadAt: undefined,
            sender: null
        } as TransformedMessage;
    
    // Dodajemo status, read_at i read polja za kompatibilnost s frontendnom
    return {
        ...baseMessage,
        ...(typeof (raw as TransformedMessage).read_by !== 'undefined' ? { read_by: (raw as TransformedMessage).read_by } : {}),
        status: baseMessage.currentUserStatus,
        read_at: baseMessage.currentUserReadAt,
        read: baseMessage.currentUserStatus === 'read' || !!baseMessage.currentUserReadAt
    };
}

// Mapa raw Prisma MemberMessage sa uključenim "sender" objektom na TransformedMessage
export function mapToMemberMessageWithSender(
    raw: Prisma.MemberMessageGetPayload<{ include: { sender: { select: { member_id: true; first_name: true; last_name: true; full_name: true } } } }> | TransformedMessage
): ApiCompatibleMessage {
    // Ako je raw već TransformedMessage s sender poljem, samo dodajemo status i read_at
    if ('currentUserStatus' in raw && raw.sender) {
        return {
            ...raw,
            status: raw.currentUserStatus,
            read_at: raw.currentUserReadAt,
            read: raw.currentUserStatus === 'read' || !!raw.currentUserReadAt
        };
    }
    
    // Inače, mapiramo kao prije
    const base = mapToMemberMessage(raw as PrismaMemberMessage);
    
    return { 
        ...base, 
        sender: raw.sender ? {
            member_id: raw.sender.member_id,
            first_name: raw.sender.first_name,
            last_name: raw.sender.last_name,
            full_name: raw.sender.full_name
        } : null
    };
}
