import api from './config';
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
    throw new Error('Failed to fetch admin messages');
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
    interface GenericMessagesResponse {
      data: ApiGenericMessage[];
      success: boolean;
    }
    const response: AxiosResponse<GenericMessagesResponse> = await api.get('/generic-messages');
    return response.data.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch generic messages');
  }
};

/**
 * Slanje poruke članu
 * @param memberId ID člana
 * @param messageText Tekst poruke
 */
export const sendMemberMessage = async (memberId: number, messageText: string): Promise<void> => {
  try {
    interface MessageResponse {
      success: boolean;
      message: string;
    }
    await api.post<MessageResponse>(`/members/${memberId}/messages`, { messageText });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message');
  }
};

/**
 * Slanje admin poruke članu
 * @param memberId ID člana
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToMember = async (memberId: number, messageText: string): Promise<void> => {
  try {
    interface MessageResponse {
      success: boolean;
      message: string;
    }
    await api.post<MessageResponse>(`/messages/member/${memberId}`, { messageText });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Slanje poruke članu nije uspjelo');
  }
};

/**
 * Slanje admin poruke grupi članova
 * @param memberIds Lista ID-ova članova
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToGroup = async (memberIds: number[], messageText: string): Promise<void> => {
  try {
    interface GroupMessageResponse {
      success: boolean;
      message: string;
      sentCount?: number;
    }
    await api.post<GroupMessageResponse>('/messages/group', { memberIds, messageText });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message to group');
  }
};

/**
 * Slanje admin poruke svim članovima
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToAll = async (messageText: string): Promise<void> => {
  try {
    interface AllMembersMessageResponse {
      success: boolean;
      message: string;
      sentCount?: number;
    }
    await api.post<AllMembersMessageResponse>('/messages/all', { messageText });
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
    interface ReadMessageResponse {
      success: boolean;
      message: string;
    }
    await api.put<ReadMessageResponse>(`/messages/${messageId}/read`);
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
    interface ArchiveMessageResponse {
      success: boolean;
      message: string;
    }
    await api.put<ArchiveMessageResponse>(`/messages/${messageId}/archive`);
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
    interface DeleteMessageResponse {
      success: boolean;
      message: string;
    }
    await api.delete<DeleteMessageResponse>(`/messages/${messageId}`);
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
    interface DeleteAllMessagesResponse {
      success: boolean;
      message: string;
      deletedCount?: number;
    }
    await api.delete<DeleteAllMessagesResponse>('/messages');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete all messages');
  }
};
