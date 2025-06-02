import api from './apiConfig';
import { ApiAdminMessage, ApiGenericMessage } from './apiTypes';
import { AxiosResponse } from 'axios';
import { parseDate, getCurrentDate } from '../../utils/dateUtils';

/**
 * Dohvaćanje poruka
 * @param forceLoad Opcija za prisilno dohvaćanje (koristi se na member_administrator tabu)
 * @returns Lista poruka za member_administratora
 */
export const getAdminMessages = async (forceLoad = false): Promise<ApiAdminMessage[]> => {
  try {
    // Dohvati ulogu korisnika iz lokalnog storagea
    const userRole = localStorage.getItem('userRole');
    
    // Ako je superuser i forceLoad nije postavljen, vrati prazno polje
    // (member_superuser ne treba vidjeti member_administrator poruke dok ne uđe na member_administrator tab)
    if (userRole === 'member_superuser' && !forceLoad) {
      console.log('Superuser nije na Administrator tabu - preskačem dohvaćanje member_administrator poruka');
      return [];
    }
    
    // Dohvati poruke s backenda
    const response = await api.get('/messages/member_administrator');
    
    // Transformiraj poruke iz backend formata u ApiAdminMessage format
    const transformedData: ApiAdminMessage[] = response.data.map((msg: any) => ({
      id: String(msg.message_id),
      content: msg.message_text,
      sender_id: String(msg.sender_id),
      sender_name: msg.sender_name || '',
      sender_type: msg.sender_type as 'member_administrator' | 'member' | 'system',
      recipient_id: msg.recipient_id ? String(msg.recipient_id) : '',
      recipient_type: msg.recipient_type as 'member_administrator' | 'member' | 'all',
      timestamp: msg.created_at ? new Date(msg.created_at).toISOString() : new Date().toISOString(),
      read: msg.status === 'read' || !!msg.read_at,
      priority: 'normal'
    }));
    
    return transformedData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get messages');
  }
};

/**
 * Dohvaćanje poruka koje je poslao member_administrator
 * @returns Lista poslanih poruka
 */
export const getAdminSentMessages = async (): Promise<ApiAdminMessage[]> => {
  try {
    const response: AxiosResponse<ApiAdminMessage[]> = await api.get('/messages/sent');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch sent messages');
  }
};

/**
 * Dohvaćanje poruka za člana
 * @param memberId ID člana
 * @returns Lista poruka za člana
 */
export const getMemberMessages = async (memberId: number): Promise<ApiAdminMessage[]> => {
  try {
    const response: AxiosResponse<ApiAdminMessage[]> = await api.get(`/messages/member/${memberId}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch member messages');
  }
};

/**
 * Dohvaćanje generičkih poruka
 * @returns Lista generičkih poruka
 */
export const getGenericMessages = async (): Promise<ApiGenericMessage[]> => {
  try {
    const response: AxiosResponse<ApiGenericMessage[]> = await api.get('/messages/generic');
    
    // Sortiranje poruka po datumu (najnovije prve)
    const sortedMessages = [...response.data].sort((a, b) => {
      const dateA = parseDate(a.created_at || '') || getCurrentDate();
      const dateB = parseDate(b.created_at || '') || getCurrentDate();
      return dateB.getTime() - dateA.getTime(); // Novije prvo
    });
    
    return sortedMessages;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get generic messages');
  }
};

/**
 * Slanje poruke članu
 * @param memberId ID člana
 * @param messageText Tekst poruke
 */
export const sendMemberMessage = async (memberId: number, messageText: string): Promise<void> => {
  try {
    await api.post(`/members/${memberId}/messages`, {
      messageText: messageText
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message to member');
  }
};

/**
 * Slanje poruke članu
 * @param memberId ID člana
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToMember = async (memberId: number, messageText: string): Promise<void> => {
  try {
    await api.post('/messages/member_administrator/to-member', {
      recipient_id: memberId,
      content: messageText
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message to member');
  }
};

/**
 * Slanje poruke grupi članova
 * @param memberIds Lista ID-ova članova
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToGroup = async (memberIds: number[], messageText: string): Promise<void> => {
  try {
    await api.post('/messages/member_administrator/to-group', {
      recipient_ids: memberIds,
      content: messageText
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message to group');
  }
};

/**
 * Slanje poruke svim članovima
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToAll = async (messageText: string): Promise<void> => {
  try {
    await api.post('/messages/member_administrator/to-all', {
      content: messageText
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message to all members');
  }
};

/**
 * Označavanje poruke kao pročitane
 * @param messageId ID poruke
 */
export const markMessageAsRead = async (messageId: number): Promise<void> => {
  try {
    await api.put(`/messages/${messageId}/read`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to mark message as read');
  }
};

/**
 * Arhiviranje poruke
 * @param messageId ID poruke
 */
export const archiveMessage = async (messageId: number): Promise<void> => {
  try {
    await api.put(`/messages/${messageId}/archive`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to archive message');
  }
};

/**
 * Brisanje poruke
 * @param messageId ID poruke
 */
export const deleteMessage = async (messageId: number): Promise<void> => {
  try {
    await api.delete(`/messages/${messageId}`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete message');
  }
};

/**
 * Brisanje svih poruka
 */
export const deleteAllMessages = async (): Promise<void> => {
  try {
    await api.delete('/messages');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete all messages');
  }
};
