import { ApiAdminMessage } from "../../../utils/api/apiTypes";
import { Message } from "../types/messageTypes";

/**
 * Tip za member poruku iz API-ja (minimalni oblik koji koristimo)
 */
interface ApiMemberMessage {
  message_id: number;
  member_id: number;
  sender?: { full_name?: string | null } | null;
  message_text: string;
  created_at: string;
  read?: boolean | null;
  sender_id: number | null;
  sender_type: 'member_administrator' | 'member' | 'member_superuser';
  recipient_id: number | null;
  recipient_type: 'member_administrator' | 'member' | 'group' | 'all';
  read_by?: Array<{
    member_id: string | number;
    read_at?: string | null;
    full_name?: string | null;
  }>; // opcionalno
}

/**
 * Funkcija za konverziju ApiAdminMessage u Message
 * @param apiMessage Poruka iz API-ja
 * @returns Poruka u formatu koji koristi komponenta
 */
export const convertApiMessageToMessage = (apiMessage: ApiAdminMessage): Message => {
  const messageId = Number(apiMessage.id);
  // Pretpostavljamo da je recipient_id relevantan za member_id u kontekstu gdje se Message koristi
  const memberId = Number(apiMessage.recipient_id); 
  const senderId = Number(apiMessage.sender_id);
  const recipientIdNum = Number(apiMessage.recipient_id);

  return {
    message_id: Number.isNaN(messageId) ? 0 : messageId, // Fallback na 0 ako je NaN
    member_id: Number.isNaN(memberId) ? 0 : memberId,
    sender_name: apiMessage.sender_name,
    message_text: apiMessage.content, // apiMessage.message_text više nije potrebno jer je content standardiziran 
    created_at: apiMessage.timestamp,
    status: apiMessage.read ? 'read' : 'unread',
    sender_id: Number.isNaN(senderId) ? 0 : senderId,
    sender_type: apiMessage.sender_type,
    recipient_id: Number.isNaN(recipientIdNum) ? 0 : recipientIdNum,
    recipient_type: apiMessage.recipient_type,
    read_by: apiMessage.read_by ?? [], // Dodajemo read_by ako postoji, inače prazan niz
  };
};

/**
 * Funkcija za konverziju liste ApiAdminMessage u listu Message
 * @param apiMessages Lista poruka iz API-ja
 * @returns Lista poruka u formatu koji koristi komponenta
 */
export const convertApiMessagesToMessages = (apiMessages: ApiAdminMessage[]): Message[] => {
  return apiMessages.map(convertApiMessageToMessage);
};

/**
 * Funkcija za konverziju poruke člana iz API-ja u Message format
 * @param apiMessage Poruka iz API-ja od člana
 * @returns Poruka u formatu koji koristi komponenta
 */
export const convertMemberApiMessageToMessage = (apiMessage: ApiMemberMessage): Message => {
  return {
    message_id: apiMessage.message_id,
    member_id: apiMessage.member_id,
    sender_name: apiMessage.sender?.full_name ?? 'Nepoznato',
    message_text: apiMessage.message_text,
    created_at: apiMessage.created_at,
    status: apiMessage.read ? 'read' : 'unread',
    sender_id: apiMessage.sender_id ?? 0,
    sender_type: apiMessage.sender_type,
    recipient_id: apiMessage.recipient_id ?? 0,
    recipient_type: apiMessage.recipient_type,
    // Normalizacija read_by polja na očekivani tip
    // - member_id uvijek string, read_at uvijek postoji (može biti null), full_name samo kad postoji
    read_by: (apiMessage.read_by ?? []).map(r => ({
      member_id: String(r.member_id),
      read_at: r.read_at ?? null,
      ...(r.full_name ? { full_name: r.full_name } : {})
    })),
  };
};
