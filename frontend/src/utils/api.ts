import axios, { AxiosError } from 'axios';
import { Member, MemberLoginData, MemberSearchResult } from '../../shared/types/member.js';
import { AuditLog } from '../../shared/types/audit.js';
import { API_BASE_URL } from './config';
import { getCurrentDate, isInTestMode, formatDate } from './dateUtils';

export interface LoginResponse {
  member: {
    id: number;
    full_name: string;
    role: Member['role'];
  };
  token: string;
}

export interface RegisterResponse {
  message: string;
  member_id?: number;
  status: 'pending';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8'
    // 'Accept-Charset' se ne može postaviti iz preglednika (sigurnosno ograničenje)
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Dodaj header za testni način rada ako je aktivan mock datum
    if (isInTestMode()) {
      config.headers['X-Test-Mode'] = 'true';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Posebna obrada za login zahtjeve
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    
    // Ako je greška 401 ali NIJE login zahtjev (dakle izgubljena sesija negdje drugdje)
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    
    // Za sve ostale greške (uključujući greške s login stranice) vraćamo originalnu grešku
    return Promise.reject(error);
  }
);

// Centralized error handler
const handleApiError = (error: unknown, defaultMessage: string): never => {
  console.error("API Error:", error);
  
  if (axios.isAxiosError(error)) {
    // Detaljnije logiranje odgovora servera za debugging
    console.log("Server response:", error.response?.data);
    
    // Izdvajamo poruku iz odgovora servera, ako postoji
    const serverMessage = error.response?.data?.message;
    
    if (serverMessage) {
      // Poboljšane poruke za krajnje korisnike
      if (serverMessage === "Member with this OIB already exists") {
        throw new Error("Član s ovim OIB-om već postoji. Molimo koristite drugi OIB ili kontaktirajte administratora.");
      }
      throw new Error(serverMessage);
    } else {
      throw new Error(defaultMessage);
    }
  }
  throw new Error(defaultMessage);
};

// Authentication APIs
// Promijenjeno sučelje da prihvaća email
export interface LoginResponse {
  member: {
    id: number;
    full_name: string;
    role: Member['role'];
  };
  token: string;
  refreshToken?: string; // Dodano polje za refresh token koji se vraća u razvojnom okruženju
}

export const login = async ({ email, password }: MemberLoginData): Promise<LoginResponse> => {
  try {
    // Šalje se email umjesto full_name
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    // Spremanje role ostaje isto
    localStorage.setItem('userRole', response.data.member.role);
    return response.data;
  } catch (error) {
    // Ovdje će se vjerojatno vratiti greška s backenda ako on i dalje očekuje full_name
    throw handleApiError(error, 'Login failed. Please check your credentials.');
  }
};

export const register = async (registerData: Omit<Member, 'member_id' | 'total_hours'>): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/register', registerData);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Registration failed. Please try again.');
  }
};

export const searchMembers = async (searchTerm: string): Promise<MemberSearchResult[]> => {
  try {
    const response = await api.get(`/auth/search-members?searchTerm=${encodeURIComponent(searchTerm)}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Member search failed');
  }
};

export const assignPassword = async (memberId: number, password: string, cardNumber: string): Promise<void> => {
  try {
    await api.post('/members/assign-password', { memberId, password, cardNumber });
  } catch (error) {
    throw handleApiError(error, 'Failed to assign password');
  }
};

// Membership APIs

// Update the interface for the membership update parameters
interface MembershipUpdateParams {
  paymentDate?: string;
  cardNumber?: string;
  stampIssued?: boolean;
  isRenewalPayment?: boolean; // Add this property to fix the type error
}

export const updateMembership = async (
  memberId: number, 
  data: MembershipUpdateParams
): Promise<any> => {
  try {
    const response = await api.post(
      `/members/${memberId}/membership`,
      data,
      {
        timeout: 30000, // Increase timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json'
        },
        // Add retry logic
        validateStatus: (status) => {
          return status >= 200 && status < 300;
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('updateMembership detailed error:', {
      error,
      request: error?.request,
      response: error?.response,
      config: error?.config
    });
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to update membership: ${message}`);
    }
    throw error;
  }
};

export const terminateMembership = async (memberId: number, reason: string) => {
  try {
    const response = await api.post(`/members/${memberId}/membership/terminate`, { 
      reason, 
      endDate: formatDate(getCurrentDate(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''), 
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to terminate membership');
  }
};

// Profile and Activities APIs
export const uploadProfileImage = async (memberId: number, imageFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post(`/members/${memberId}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.imagePath;
  } catch (error) {
    throw handleApiError(error, 'Failed to upload image');
  }
};

export const getMemberActivities = async (memberId: number) => {
  try {
    const response = await api.get(`/members/${memberId}/activities`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch member activities');
  }
};

// Message APIs
export const getAdminMessages = async (): Promise<any[]> => {
  try {
    const response = await api.get('/messages/admin');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch admin messages');
  }
};

export const getAllMembers = async (): Promise<any[]> => {
  try {
    const response = await api.get('/members');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Nije moguće dohvatiti popis svih članova');
  }
};

export const sendMemberMessage = async (memberId: number, messageText: string): Promise<void> => {
  try {
    await api.post(`/members/${memberId}/messages`, { messageText });
  } catch (error) {
    throw handleApiError(error, 'Failed to send message');
  }
};

export const sendAdminMessageToMember = async (memberId: number, messageText: string): Promise<void> => {
  try {
    await api.post(`/messages/member/${memberId}`, { messageText });
  } catch (error) {
    throw handleApiError(error, 'Slanje poruke članu nije uspjelo');
  }
};

export const sendAdminMessageToGroup = async (memberIds: number[], messageText: string): Promise<void> => {
  try {
    await api.post('/messages/group', { memberIds, messageText });
  } catch (error) {
    throw handleApiError(error, 'Slanje poruke grupi članova nije uspjelo');
  }
};

export const sendAdminMessageToAll = async (messageText: string): Promise<void> => {
  try {
    await api.post('/messages/all', { messageText });
  } catch (error) {
    throw handleApiError(error, 'Slanje poruke svim članovima nije uspjelo');
  }
};

export const getAdminSentMessages = async (): Promise<any[]> => {
  try {
    const response = await api.get('/messages/sent');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch sent messages');
  }
};

export const getMemberMessages = async (memberId: number): Promise<any[]> => {
  try {
    const response = await api.get(`/members/${memberId}/messages`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch member messages');
  }
};

export interface GenericMessage {
  id: number;
  content: string;
  sender: string;
  timestamp: string;
}

export const getGenericMessages = async (): Promise<GenericMessage[]> => {
  try {
    const response = await api.get('/generic-messages');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch generic messages');
  }
};

export const markMessageAsRead = async (messageId: number): Promise<void> => {
  try {
    // Potrebno je dohvatiti trenutnog korisnika iz localStorage
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Niste prijavljeni');
    
    // Dohvati podatke o korisniku iz tokena
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const userRole = tokenData.role;
    const memberId = tokenData.id;
    
    if (userRole === 'admin' || userRole === 'superuser') {
      // Admin ruta
      await api.put(`/messages/${messageId}/read`);
    } else if (userRole === 'member' && memberId) {
      // Član ruta - koristi novu rutu za članove
      await api.put(`/members/${memberId}/messages/${messageId}/read`);
    } else {
      throw new Error('Nemate ovlasti za označavanje poruka kao pročitane');
    }
  } catch (error) {
    throw handleApiError(error, 'Nije moguće označiti poruku kao pročitanu');
  }
};

export const archiveMessage = async (messageId: number): Promise<void> => {
  try {
    await api.put(`/messages/${messageId}/archive`);
  } catch (error) {
    throw handleApiError(error, 'Failed to archive message');
  }
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  try {
    await api.delete(`/messages/${messageId}`);
  } catch (error) {
    throw handleApiError(error, 'Failed to delete message');
  }
};

export const deleteAllMessages = async (): Promise<void> => {
  try {
    await api.delete('/messages');
  } catch (error) {
    throw handleApiError(error, 'Failed to delete all messages');
  }
};

// Audit APIs
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const response = await api.get('/audit/logs');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch audit logs');
  }
};

// Settings APIs
export const getCardNumberLength = async (): Promise<number> => {
  try {
    const response = await api.get('/settings/card-length');
    return response.data.cardNumberLength;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch card number length setting');
  }
};

export const updateCardNumberLength = async (length: number): Promise<void> => {
  try {
    await api.put('/settings/card-length', { length });
  } catch (error) {
    throw handleApiError(error, 'Failed to update card number length');
  }
};

// Card Number APIs
export const getAvailableCardNumbers = async (): Promise<string[]> => {
  try {
    // Dodana eksplicitna provjera statusa
    const response = await api.get('/card-numbers/available');
    
    // Osiguraj da je response.data array, a ako nije, vrati prazan array
    if (!Array.isArray(response.data)) {
      return [];
    }
    
    // Dodatna provjera i filtriranje
    const availableNumbers = response.data;
    
    return availableNumbers;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch available card numbers');
  }
};

export const addCardNumber = async (cardNumber: string): Promise<void> => {
  try {
    await api.post('/card-numbers/add', { cardNumber });
  } catch (error) {
    throw handleApiError(error, 'Failed to add card number');
  }
};

export const addCardNumberRange = async (start: number, end: number): Promise<void> => {
  try {
    await api.post('/card-numbers/add-range', { start, end });
  } catch (error) {
    throw handleApiError(error, 'Failed to add card number range');
  }
};

export const getAllCardNumbers = async (): Promise<{ 
  cards: Array<{
    card_number: string; 
    status: 'available' | 'assigned' | 'retired';
    member_id?: number;
    member_name?: string;
  }>,
  stats: {
    total: number;
    available: number;
    assigned: number;
  }
}> => {
  try {
    const response = await api.get('/card-numbers/all');
    return response.data;
  } catch (error) {
    console.error("API: Error fetching card numbers:", error);
    throw handleApiError(error, 'Failed to fetch card numbers');
  }
};

// Make sure the deleteCardNumber function returns properly
export const deleteCardNumber = async (cardNumber: string): Promise<{ message: string, cardNumber: string }> => {
  try {
    const response = await api.delete(`/card-numbers/${cardNumber}`);
    return response.data;
  } catch (error) {
    console.error('API error deleting card number:', error);
    throw handleApiError(error, 'Failed to delete card number');
  }
};

// Nova funkcija za sinkronizaciju statusa brojeva iskaznica
export const syncCardNumberStatus = async (): Promise<{ updated: number; message: string }> => {
  try {
    const response = await api.post('/card-numbers/sync-status');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to synchronize card number status');
  }
};

export const assignCardNumber = async (memberId: number, cardNumber: string): Promise<{
  message: string;
  card_number: string;
  status: string;
  generatedPassword?: string;
}> => {
  try {
    const response = await api.post(`/members/${memberId}/card`, { cardNumber });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to assign card number');
  }
};

// Stamp Inventory History APIs
export const getStampHistory = async (): Promise<any[]> => {
  try {
    const response = await api.get('/stamps/history');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch stamp history');
  }
};

export const getStampHistoryByYear = async (year: number): Promise<any[]> => {
  try {
    const response = await api.get(`/stamps/history/${year}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to fetch stamp history for year ${year}`);
  }
};

export const resetStampInventory = async (year: number, notes: string = ''): Promise<any> => {
  try {
    const response = await api.post('/stamps/reset-year', { year, notes });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to reset stamp inventory');
  }
};

export const archiveStampInventory = async (year: number, notes: string = '', force: boolean = false): Promise<any> => {
  try {
    const response = await api.post('/stamps/archive-year', { year, notes, force });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to archive stamp inventory');
  }
};

export const cleanupTestData = async (): Promise<{ 
  success: boolean;
  message: string;
  details: {
    deletedRecords: number;
    affectedMembers: number;
    memberIds: number[];
  }
}> => {
  try {
    const response = await api.post('debug/cleanup-test-data');
    console.log('🧹 Testni podaci uspješno očišćeni:', response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Greška prilikom čišćenja testnih podataka');
  }
};

export default api;