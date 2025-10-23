import axios from 'axios';
import { API_BASE_URL } from '../config';

// Dedicirani axios instance za Support API koji koristi systemManagerToken
const supportApiInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor koji koristi systemManagerToken
supportApiInstance.interceptors.request.use(
  (config) => {
    const systemManagerToken = localStorage.getItem('systemManagerToken');
    if (systemManagerToken && config.headers) {
      config.headers.Authorization = `Bearer ${systemManagerToken}`;
    }
    return config;
  },
  (error) => Promise.reject(new Error(String(error)))
);
import { 
  SupportTicket, 
  CreateTicketRequest, 
  UpdateTicketRequest, 
  CreateTicketResponseRequest,
  TicketListFilters,
  TicketStatus,
  TicketPriority,
  TicketResponse
} from '@shared/supportTicket';

// API endpoints for Support & Feedback system
export const supportTicketApi = {
  // Create new support ticket
  createTicket: async (data: CreateTicketRequest): Promise<{ success: boolean; message: string; ticket: SupportTicket }> => {
    const response = await supportApiInstance.post<{ success: boolean; message: string; ticket: SupportTicket }>('/support', data);
    return response.data;
  },

  // Get ticket by ID
  getTicketById: async (id: number): Promise<{ success: boolean; ticket: SupportTicket }> => {
    const response = await supportApiInstance.get<{ success: boolean; ticket: SupportTicket }>(`/support/${id}`);
    return response.data;
  },

  // Get tickets list with filters and pagination
  getTickets: async (
    filters: TicketListFilters = {}, 
    page = 1, 
    limit = 20
  ): Promise<{ 
    success: boolean; 
    tickets: SupportTicket[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number; 
  }> => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assigned_to !== undefined) params.append('assigned_to', filters.assigned_to.toString());
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await supportApiInstance.get<{ success: boolean; tickets: SupportTicket[]; total: number; page: number; limit: number; totalPages: number; }>(`/support?${params.toString()}`);
    return response.data;
  },

  // Get my tickets (for organization SM)
  getMyTickets: async (
    page = 1, 
    limit = 20
  ): Promise<{ 
    success: boolean; 
    tickets: SupportTicket[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number; 
  }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await supportApiInstance.get<{ success: boolean; tickets: SupportTicket[]; total: number; page: number; limit: number; totalPages: number; }>(`/support/my-tickets?${params.toString()}`);
    return response.data;
  },

  // Update ticket
  updateTicket: async (id: number, data: UpdateTicketRequest): Promise<{ success: boolean; message: string; ticket: SupportTicket }> => {
    const response = await supportApiInstance.put<{ success: boolean; message: string; ticket: SupportTicket }>(`/support/${id}`, data);
    return response.data;
  },

  // Add response to ticket
  addTicketResponse: async (id: number, data: CreateTicketResponseRequest): Promise<{ success: boolean; message: string; response: TicketResponse }> => {
    const response = await supportApiInstance.post<{ success: boolean; message: string; response: TicketResponse }>(`/support/${id}/responses`, data);
    return response.data;
  },

  // Get ticket statistics
  getTicketStats: async (): Promise<{ 
    success: boolean; 
    stats: {
      total: number;
      open: number;
      in_progress: number;
      resolved: number;
      closed: number;
    }
  }> => {
    const response = await supportApiInstance.get<{ success: boolean; stats: { total: number; open: number; in_progress: number; resolved: number; closed: number; } }>('/support/stats');
    return response.data;
  },

  // Close ticket
  closeTicket: async (id: number): Promise<{ success: boolean; message: string; ticket: SupportTicket }> => {
    const response = await supportApiInstance.put<{ success: boolean; message: string; ticket: SupportTicket }>(`/support/${id}/close`);
    return response.data;
  },

  // Assign ticket (for GSM)
  assignTicket: async (id: number, assigned_to: number): Promise<{ success: boolean; message: string; ticket: SupportTicket }> => {
    const response = await supportApiInstance.put<{ success: boolean; message: string; ticket: SupportTicket }>(`/support/${id}`, { assigned_to });
    return response.data;
  },

  // Update ticket status
  updateTicketStatus: async (id: number, status: TicketStatus): Promise<{ success: boolean; message: string; ticket: SupportTicket }> => {
    const response = await supportApiInstance.put<{ success: boolean; message: string; ticket: SupportTicket }>(`/support/${id}`, { status });
    return response.data;
  },

  // Update ticket priority
  updateTicketPriority: async (id: number, priority: TicketPriority): Promise<{ success: boolean; message: string; ticket: SupportTicket }> => {
    const response = await supportApiInstance.put<{ success: boolean; message: string; ticket: SupportTicket }>(`/support/${id}`, { priority });
    return response.data;
  }
};
