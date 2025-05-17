import { ApiAdminMessage } from "../../../utils/api/apiTypes";
import { Message } from "../types/messageTypes";

/**
 * Funkcija za konverziju ApiAdminMessage u Message
 * @param apiMessage Poruka iz API-ja
 * @returns Poruka u formatu koji koristi komponenta
 */
export const convertApiMessageToMessage = (apiMessage: ApiAdminMessage): Message => {
  return {
    message_id: parseInt(apiMessage.id),
    member_id: parseInt(apiMessage.recipient_id),
    sender_name: apiMessage.sender_name,
    message_text: apiMessage.content,
    created_at: apiMessage.timestamp,
    status: apiMessage.read ? 'read' : 'unread',
    sender_id: parseInt(apiMessage.sender_id),
    sender_type: apiMessage.sender_type,
    recipient_id: parseInt(apiMessage.recipient_id),
    recipient_type: apiMessage.recipient_type
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
