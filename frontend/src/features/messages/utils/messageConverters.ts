import { ApiAdminMessage } from "../../../utils/api/apiTypes";
import { Message } from "../types/messageTypes";

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
    message_id: isNaN(messageId) ? 0 : messageId, // Fallback na 0 ako je NaN, razmotriti bolje rukovanje greškom
    member_id: isNaN(memberId) ? 0 : memberId,     // Isto
    sender_name: apiMessage.sender_name,
    message_text: apiMessage.content, // apiMessage.message_text više nije potrebno jer je content standardiziran 
    created_at: apiMessage.timestamp,
    status: apiMessage.read ? 'read' : 'unread',
    sender_id: isNaN(senderId) ? 0 : senderId,     // Isto
    sender_type: apiMessage.sender_type,
    recipient_id: isNaN(recipientIdNum) ? 0 : recipientIdNum, // Isto
    recipient_type: apiMessage.recipient_type,
    read_by: apiMessage.read_by || [] // Dodajemo read_by ako postoji, inače prazan niz
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
