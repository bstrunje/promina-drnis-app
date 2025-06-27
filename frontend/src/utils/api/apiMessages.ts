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
    const transformedData: ApiAdminMessage[] = response.data.map((msg: any) => {
      // Izvuci ime pošiljatelja iz sender objekta ako postoji
      const senderName = msg.sender ? msg.sender.full_name || `${msg.sender.first_name} ${msg.sender.last_name}`.trim() : '';
      
      return {
        id: String(msg.message_id),
        content: msg.message_text,
        sender_id: String(msg.sender_id),
        // Koristi ime pošiljatelja iz sender objekta ili fallback na staro polje
        sender_name: senderName || msg.sender_name || '',
        sender_type: msg.sender_type as 'member_administrator' | 'member' | 'member_superuser',
        recipient_id: msg.recipient_id ? String(msg.recipient_id) : '',
        recipient_type: msg.recipient_type as 'member_administrator' | 'member' | 'all' | 'group',
        timestamp: msg.created_at ? new Date(msg.created_at).toISOString() : new Date().toISOString(),
        // Koristi read polje koje smo dodali u backend mapperu ili fallback na staru logiku
        read: typeof msg.read === 'boolean' ? msg.read : (msg.status === 'read' || !!msg.read_at),
        priority: msg.priority || 'normal',
        read_by: msg.read_by || [] // Dodajemo read_by ako postoji
      };
    });
    
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
    const response = await api.get('/messages/sent');
    // Transformiraj poruke iz backend formata u ApiAdminMessage format
    const transformedData: ApiAdminMessage[] = response.data.map((msg: any) => {
      // Izvuci ime pošiljatelja iz sender objekta ako postoji
      const senderName = msg.sender ? msg.sender.full_name || `${msg.sender.first_name} ${msg.sender.last_name}`.trim() : '';
      
      return {
        id: String(msg.message_id),
        content: msg.message_text,
        sender_id: String(msg.sender_id),
        // Koristi ime pošiljatelja iz sender objekta ili fallback na staro polje
        sender_name: senderName || msg.sender_name || '',
        sender_type: msg.sender_type as 'member_administrator' | 'member' | 'member_superuser',
        recipient_id: msg.recipient_id ? String(msg.recipient_id) : (msg.recipient_type === 'all' ? 'all' : ''),
      recipient_type: msg.recipient_type as 'member_administrator' | 'member' | 'all' | 'group',
      timestamp: msg.created_at ? new Date(msg.created_at).toISOString() : new Date().toISOString(),
      // Koristi read polje koje smo dodali u backend mapperu ili fallback na staru logiku
      read: typeof msg.read === 'boolean' ? msg.read : (msg.status === 'read' || !!msg.read_at),
      read_by: Array.isArray(msg.read_by)
        ? msg.read_by.map((rb: any) => ({
            member_id: String(rb.member_id),
            read_at: rb.read_at ? new Date(rb.read_at).toISOString() : null,
            full_name: rb.full_name || undefined // Mapiramo full_name ako postoji
          }))
        : [],
      priority: msg.priority || 'normal'
    };
  });
    return transformedData;
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
    const response = await api.get(`/members/${memberId}/messages`);
    // Transformiraj poruke iz backend formata u ApiAdminMessage format
    const transformedData: ApiAdminMessage[] = response.data.map((msg: any) => {
      // Izvuci ime pošiljatelja iz sender objekta ako postoji
      const senderName = msg.sender ? msg.sender.full_name || `${msg.sender.first_name} ${msg.sender.last_name}`.trim() : '';
      
      return {
        id: String(msg.message_id),
        content: msg.message_text,
        sender_id: String(msg.sender_id),
        // Koristi ime pošiljatelja iz sender objekta ili fallback na staro polje
        sender_name: senderName || msg.sender_name || '',
        sender_type: msg.sender_type as 'member_administrator' | 'member' | 'member_superuser',
        recipient_id: msg.recipient_id ? String(msg.recipient_id) : '',
        recipient_type: msg.recipient_type as 'member_administrator' | 'member' | 'all' | 'group',
        timestamp: msg.created_at ? new Date(msg.created_at).toISOString() : new Date().toISOString(),
        // Koristi read polje koje smo dodali u backend mapperu ili fallback na staru logiku
        read: typeof msg.read === 'boolean' ? msg.read : (msg.status === 'read' || !!msg.read_at),
        priority: msg.priority || 'normal',
        read_by: msg.read_by || [] // Dodajemo read_by ako postoji
      };
    });
    return transformedData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch member messages');
  }
};

/**
 * Dohvaćanje poslanih poruka člana
 * @returns Lista poslanih poruka
 */
export const getMemberSentMessages = async (): Promise<any[]> => {
  try {
    const response = await api.get('/members/sent');
    return response.data;
  } catch (error) {
    console.error('Error fetching sent member messages:', error);
    throw error;
  }
};

/**
 * Dohvaćanje generičkih poruka
 * @returns Lista generičkih poruka
 */
interface GenericMessagesApiResponse {
  success: boolean;
  data: ApiGenericMessage[];
  message?: string;
}

export const getGenericMessages = async (): Promise<ApiGenericMessage[]> => {
  try {
    const response: AxiosResponse<GenericMessagesApiResponse> = await api.get('/generic-messages');
    
    // Provjera uspješnosti odgovora i postojanja podataka
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const messagesArray = response.data.data;
      // Sortiranje poruka po datumu (najnovije prve)
      const sortedMessages = [...messagesArray].sort((a, b) => {
        const dateA = parseDate(a.created_at || '') || new Date(0); // Koristimo new Date(0) kao fallback za sortiranje
        const dateB = parseDate(b.created_at || '') || new Date(0); // Koristimo new Date(0) kao fallback za sortiranje
        return dateB.getTime() - dateA.getTime(); // Novije prvo
      });
      return sortedMessages;
    } else {
      console.error('Failed to fetch generic messages or unexpected format:', response.data?.message || response.data);
      return []; // Vraćamo prazno polje ako odgovor nije uspješan ili format nije ispravan
    }
  } catch (error) {
    // Postojeća error handling logika koja re-throwa error
    // To će biti uhvaćeno od strane pozivatelja (MemberMessageList.tsx)
    if (error instanceof Error) {
      console.error('Error in getGenericMessages:', error.message);
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
    await api.post(`/messages/member/${memberId}`, {
      recipient_id: memberId,
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
 * Slanje poruke grupi članova
 * @param memberIds Lista ID-ova članova
 * @param messageText Tekst poruke
 */
export const sendAdminMessageToGroup = async (memberIds: number[], messageText: string): Promise<void> => {
  try {
    await api.post('/messages/member_administrator/to-group', {
      recipientMemberIds: memberIds,
      messageText: messageText
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
      messageText: messageText
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

/**
 * Dohvaćanje broja nepročitanih poruka za trenutnog korisnika
 * @returns Broj nepročitanih poruka
 */
export const getUnreadMessageCount = async (): Promise<number> => {
  try {
    // Dodajemo timestamp kao query parametar da izbjegnemo keširanje
    const timestamp = new Date().getTime();
    const response = await api.get(`/members/unread-count?t=${timestamp}`);
    
    // Ako backend vraća objekt s count svojstvom, koristimo ga
    if (response.data && typeof response.data.count === 'number') {
      return response.data.count;
    }
    
    // Ako backend vraća samo broj, koristimo ga direktno
    if (typeof response.data === 'number') {
      return response.data;
    }
    
    // Ako ne možemo dobiti broj nepročitanih poruka, vraćamo 0
    console.warn('Neočekivani format odgovora za broj nepročitanih poruka:', response.data);
    return 0;
  } catch (error) {
    console.error('Greška pri dohvaćanju broja nepročitanih poruka:', error);
    // U slučaju greške, vraćamo 0 umjesto bacanja iznimke
    // kako ne bismo prekinuli rad aplikacije zbog ove funkcionalnosti
    return 0;
  }
};
