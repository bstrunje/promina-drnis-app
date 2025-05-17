import api from './apiConfig';
import { ApiAdminMessage, ApiGenericMessage } from './apiTypes';
import { AxiosResponse } from 'axios';

/**
 * Dohvaćanje poruka za admina
 * @returns Lista poruka za admina
 */
export const getAdminMessages = async (): Promise<ApiAdminMessage[]> => {
  try {
    const response: AxiosResponse<ApiAdminMessage[]> = await api.get('/messages/admin');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get admin messages');
  }
};

/**
 * Dohvaćanje poruka koje je poslao admin
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
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
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
    await api.post('/messages/member', {
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
 * Slanje admin poruke članu
 * @param memberId ID člana
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToMember = async (memberId: number, messageText: string): Promise<void> => {
  try {
    await api.post('/messages/admin/to-member', {
      recipient_id: memberId,
      content: messageText
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send admin message to member');
  }
};

/**
 * Slanje admin poruke grupi članova
 * @param memberIds Lista ID-ova članova
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToGroup = async (memberIds: number[], messageText: string): Promise<void> => {
  try {
    await api.post('/messages/admin/to-group', {
      recipient_ids: memberIds,
      content: messageText
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send admin message to group');
  }
};

/**
 * Slanje admin poruke svim članovima
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToAll = async (messageText: string): Promise<void> => {
  try {
    await api.post('/messages/admin/to-all', {
      content: messageText
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send admin message to all members');
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
