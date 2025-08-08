import api from './apiConfig';
import { ApiAdminMessage, ApiGenericMessage } from './apiTypes';
import { AxiosResponse } from 'axios';
import { parseDate } from '../../utils/dateUtils';

// Tip koji opisuje backend poruku (sva polja opcionalna jer dolaze iz vanjskog izvora)
interface BackendMessage {
  message_id?: unknown;
  message_text?: unknown;
  sender_id?: unknown;
  sender_name?: unknown;
  sender_type?: unknown; // nepoznato s backend-a, kasnije normaliziramo na podržane literalne tipove
  recipient_id?: unknown;
  recipient_type?: unknown; // nepoznato s backend-a, kasnije normaliziramo na podržane literalne tipove
  created_at?: unknown;
  read?: unknown;
  status?: unknown;
  priority?: unknown;
  read_by?: unknown;
  sender?: unknown;
}

interface SenderLike { full_name?: unknown; first_name?: unknown; last_name?: unknown }
interface ReadByLike { member_id?: unknown; read_at?: unknown; full_name?: unknown }

// Sigurna konverzija u string bez oslanjanja na Object default stringification
const safeToString = (val: unknown): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
};

// Pretvara nepoznatu vrijednost u ISO datum ili vraća trenutni datum
const toIsoOrNow = (val: unknown): string => {
  const s = safeToString(val);
  if (!s) return new Date().toISOString();
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const mapReadByArray = (arr: unknown): { member_id: string; read_at: string | null; full_name?: string }[] => {
  if (!Array.isArray(arr)) return [];
  return arr.map((rb: unknown) => {
    const r = rb as Partial<ReadByLike>;
    return {
      member_id: safeToString(r.member_id),
      read_at: (() => {
        if (r.read_at == null) return null;
        const ds = safeToString(r.read_at);
        if (!ds) return null;
        const d = new Date(ds);
        return isNaN(d.getTime()) ? null : d.toISOString();
      })(),
      full_name: typeof r.full_name === 'string' ? r.full_name : undefined
    };
  });
};

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
    const raw: unknown = response.data;
    const arr: unknown[] = Array.isArray(raw) ? raw : [];
    
    // Transformiraj poruke iz backend formata u ApiAdminMessage format
    const transformedData: ApiAdminMessage[] = arr.map((msg: unknown) => {
      const m = msg as Partial<BackendMessage>;
      const senderObj: Partial<SenderLike> | undefined = (m.sender && typeof m.sender === 'object') ? (m.sender as Partial<SenderLike>) : undefined;
      const firstName = senderObj && typeof senderObj.first_name === 'string' ? senderObj.first_name : '';
      const lastName = senderObj && typeof senderObj.last_name === 'string' ? senderObj.last_name : '';
      const fullName = senderObj && typeof senderObj.full_name === 'string' ? senderObj.full_name : '';
      const composedName = `${firstName} ${lastName}`.trim();
      const senderName = fullName || composedName || (typeof m.sender_name === 'string' ? m.sender_name : '');
      const sender_type = m.sender_type === 'member' || m.sender_type === 'member_administrator' || m.sender_type === 'member_superuser'
        ? m.sender_type
        : 'member';
      const recipient_type = m.recipient_type === 'member' || m.recipient_type === 'member_administrator' || m.recipient_type === 'all' || m.recipient_type === 'group'
        ? m.recipient_type
        : 'member';
      const priority: 'normal' | 'high' = m.priority === 'high' ? 'high' : 'normal';
      
      return {
        id: safeToString(m.message_id),
        content: typeof m.message_text === 'string' ? m.message_text : '',
        sender_id: safeToString(m.sender_id),
        // Koristi ime pošiljatelja iz sender objekta ili fallback na staro polje
        sender_name: senderName,
        sender_type,
        recipient_id: m.recipient_id != null ? safeToString(m.recipient_id) : '',
        recipient_type,
        timestamp: toIsoOrNow(m.created_at),
        // Koristi read polje koje smo dodali u backend mapperu ili fallback na staru logiku
        read: typeof m.read === 'boolean' ? m.read : (m.status === 'read' || !!(m as { read_at?: unknown }).read_at),
        priority,
        read_by: mapReadByArray(m.read_by)
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
    const raw: unknown = response.data;
    const arr: unknown[] = Array.isArray(raw) ? raw : [];
    // Transformiraj poruke iz backend formata u ApiAdminMessage format
    const transformedData: ApiAdminMessage[] = arr.map((msg: unknown) => {
      const m = msg as Partial<BackendMessage>;
      const senderObj: Partial<SenderLike> | undefined = (m.sender && typeof m.sender === 'object') ? (m.sender as Partial<SenderLike>) : undefined;
      const firstName = senderObj && typeof senderObj.first_name === 'string' ? senderObj.first_name : '';
      const lastName = senderObj && typeof senderObj.last_name === 'string' ? senderObj.last_name : '';
      const fullName = senderObj && typeof senderObj.full_name === 'string' ? senderObj.full_name : '';
      const composedName = `${firstName} ${lastName}`.trim();
      const senderName = fullName || composedName || (typeof m.sender_name === 'string' ? m.sender_name : '');
      const sender_type = m.sender_type === 'member' || m.sender_type === 'member_administrator' || m.sender_type === 'member_superuser'
        ? m.sender_type
        : 'member';
      const recipient_type = m.recipient_type === 'member' || m.recipient_type === 'member_administrator' || m.recipient_type === 'all' || m.recipient_type === 'group'
        ? m.recipient_type
        : 'member';
      const priority: 'normal' | 'high' = m.priority === 'high' ? 'high' : 'normal';
      
      return {
        id: safeToString(m.message_id),
        content: typeof m.message_text === 'string' ? m.message_text : '',
        sender_id: safeToString(m.sender_id),
        // Koristi ime pošiljatelja iz sender objekta ili fallback na staro polje
        sender_name: senderName,
        sender_type,
        recipient_id: m.recipient_id != null ? safeToString(m.recipient_id) : (recipient_type === 'all' ? 'all' : ''),
        recipient_type,
        timestamp: toIsoOrNow(m.created_at),
        // Koristi read polje koje smo dodali u backend mapperu ili fallback na staru logiku
        read: typeof m.read === 'boolean' ? m.read : (m.status === 'read' || !!(m as { read_at?: unknown }).read_at),
        read_by: mapReadByArray(m.read_by),
        priority
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
    const raw: unknown = response.data;
    const arr: unknown[] = Array.isArray(raw) ? raw : [];
    // Transformiraj poruke iz backend formata u ApiAdminMessage format
    const transformedData: ApiAdminMessage[] = arr.map((msg: unknown) => {
      const m = msg as Partial<BackendMessage>;
      const senderObj: Partial<SenderLike> | undefined = (m.sender && typeof m.sender === 'object') ? (m.sender as Partial<SenderLike>) : undefined;
      const firstName = senderObj && typeof senderObj.first_name === 'string' ? senderObj.first_name : '';
      const lastName = senderObj && typeof senderObj.last_name === 'string' ? senderObj.last_name : '';
      const fullName = senderObj && typeof senderObj.full_name === 'string' ? senderObj.full_name : '';
      const composedName = `${firstName} ${lastName}`.trim();
      const senderName = fullName || composedName || (typeof m.sender_name === 'string' ? m.sender_name : '');
      const sender_type = m.sender_type === 'member' || m.sender_type === 'member_administrator' || m.sender_type === 'member_superuser' ? m.sender_type : 'member';
      const recipient_type = m.recipient_type === 'member' || m.recipient_type === 'member_administrator' || m.recipient_type === 'all' || m.recipient_type === 'group' ? m.recipient_type : 'member';
      const priority: 'normal' | 'high' = m.priority === 'high' ? 'high' : 'normal';
      
      return {
        id: safeToString(m.message_id),
        content: typeof m.message_text === 'string' ? m.message_text : '',
        sender_id: safeToString(m.sender_id),
        // Koristi ime pošiljatelja iz sender objekta ili fallback na staro polje
        sender_name: senderName,
        sender_type,
        recipient_id: m.recipient_id != null ? safeToString(m.recipient_id) : '',
        recipient_type,
        timestamp: toIsoOrNow(m.created_at),
        // Koristi read polje koje smo dodali u backend mapperu ili fallback na staru logiku
        read: typeof m.read === 'boolean' ? m.read : (m.status === 'read' || !!(m as { read_at?: unknown }).read_at),
        priority,
        read_by: mapReadByArray(m.read_by)
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
export const getMemberSentMessages = async (): Promise<unknown[]> => {
  try {
    const response = await api.get('/members/sent');
    const raw: unknown = response.data;
    const result: unknown[] = Array.isArray(raw) ? (raw as unknown[]) : [];
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch sent member messages');
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
        const dateA = parseDate(a.created_at ?? '') ?? new Date(0); // Koristimo new Date(0) kao fallback za sortiranje
        const dateB = parseDate(b.created_at ?? '') ?? new Date(0); // Koristimo new Date(0) kao fallback za sortiranje
        return dateB.getTime() - dateA.getTime(); // Novije prvo
      });
      return sortedMessages;
    } else {
      // Ako ne možemo dobiti broj nepročitanih poruka, vraćamo 0
      // (namjerna tiha degradacija bez console logova radi ESLint pravila)
      return []; // Vraćamo prazno polje ako odgovor nije uspješan ili format nije ispravan
    }
  } catch {
    // U slučaju greške, vraćamo 0 umjesto bacanja iznimke
    // kako ne bismo prekinuli rad aplikacije zbog ove funkcionalnosti
    // (namjerna tiha degradacija bez console logova radi ESLint pravila)
    return []; // Vraćamo prazno polje ako odgovor nije uspješan ili format nije ispravan
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
    const data: unknown = response.data;
    
    // Ako backend vraća objekt s count svojstvom, koristimo ga
    if (typeof data === 'object' && data !== null && 'count' in (data as Record<string, unknown>)) {
      const cnt = (data as { count: unknown }).count;
      if (typeof cnt === 'number') {
        return cnt;
      }
    }
    
    // Ako backend vraća samo broj, koristimo ga direktno
    if (typeof data === 'number') {
      return data;
    }
    
    // Ako ne možemo dobiti broj nepročitanih poruka, vraćamo 0
    // (namjerna tiha degradacija bez console logova radi ESLint pravila)
    return 0;
  } catch {
    // U slučaju greške, vraćamo 0 umjesto bacanja iznimke
    // kako ne bismo prekinuli rad aplikacije zbog ove funkcionalnosti
    // (namjerna tiha degradacija bez console logova radi ESLint pravila)
    return 0;
  }
};
