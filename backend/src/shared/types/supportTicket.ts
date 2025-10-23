// Support & Feedback System Types

export enum TicketCategory {
  BUG_REPORT = 'BUG_REPORT',
  FEATURE_REQUEST = 'FEATURE_REQUEST', 
  COMPLAINT = 'COMPLAINT',
  GENERAL_SUPPORT = 'GENERAL_SUPPORT'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface SupportTicket {
  id: number;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  organization_id: number;
  created_by: number;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  responses?: TicketResponse[];
  // Organization relation (populated by backend)
  organization?: {
    id: number;
    name: string;
    subdomain: string;
  };
  // Creator relation (populated by backend)
  creator?: {
    id: number;
    display_name: string;
    email: string;
  };
}

export interface TicketResponse {
  id: number;
  ticket_id: number;
  response_text: string;
  created_by: number;
  is_internal: boolean;
  created_at: string;
  // Creator relation (populated by backend)
  creator?: {
    id: number;
    display_name: string;
    email: string;
  };
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: number;
}

export interface CreateTicketResponseRequest {
  response_text: string;
  is_internal?: boolean;
}

export interface TicketListFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigned_to?: number;
}

// Category display mappings
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.BUG_REPORT]: 'Bug Reports',
  [TicketCategory.FEATURE_REQUEST]: 'Feature Requests',
  [TicketCategory.COMPLAINT]: 'Complaints',
  [TicketCategory.GENERAL_SUPPORT]: 'General Support'
};

export const TICKET_CATEGORY_COLORS: Record<TicketCategory, string> = {
  [TicketCategory.BUG_REPORT]: 'bg-red-100 text-red-800',
  [TicketCategory.FEATURE_REQUEST]: 'bg-blue-100 text-blue-800',
  [TicketCategory.COMPLAINT]: 'bg-orange-100 text-orange-800',
  [TicketCategory.GENERAL_SUPPORT]: 'bg-green-100 text-green-800'
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.IN_PROGRESS]: 'In Progress',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed'
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Low',
  [TicketPriority.MEDIUM]: 'Medium',
  [TicketPriority.HIGH]: 'High',
  [TicketPriority.URGENT]: 'Urgent'
};
