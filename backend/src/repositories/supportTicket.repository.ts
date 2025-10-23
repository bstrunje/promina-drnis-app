import prisma from '../utils/prisma.js';
import { TicketCategory, TicketStatus, TicketPriority, Prisma } from '@prisma/client';

export interface CreateTicketData {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  organization_id: number;
  created_by: number;
}

export interface UpdateTicketData {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: number;
  resolved_at?: Date;
}

export interface TicketFilters {
  organization_id?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigned_to?: number;
  created_by?: number;
}

export interface CreateTicketResponseData {
  ticket_id: number;
  response_text: string;
  created_by: number;
  is_internal?: boolean;
}

class SupportTicketRepository {
  // Create new support ticket
  async createTicket(data: CreateTicketData) {
    return await prisma.supportTicket.create({
      data,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        }
      }
    });
  }

  // Get ticket by ID with responses
  async getTicketById(id: number, organization_id?: number) {
    const where: Prisma.SupportTicketWhereUniqueInput = { id };
    if (organization_id) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.findUnique({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        },
        responses: {
          orderBy: {
            created_at: 'asc'
          }
        }
      }
    });
  }

  // Get tickets with filters
  async getTickets(filters: TicketFilters = {}, limit = 50, offset = 0) {
    const where: Prisma.SupportTicketWhereInput = {};
    
    if (filters.organization_id) where.organization_id = filters.organization_id;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigned_to !== undefined) where.assigned_to = filters.assigned_to;
    if (filters.created_by) where.created_by = filters.created_by;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              subdomain: true
            }
          },
          responses: {
            select: {
              id: true,
              created_at: true,
              is_internal: true
            },
            orderBy: {
              created_at: 'desc'
            },
            take: 1
          }
        },
        orderBy: [
          { priority: 'desc' },
          { created_at: 'desc' }
        ],
        take: limit,
        skip: offset
      }),
      prisma.supportTicket.count({ where })
    ]);

    return { tickets, total };
  }

  // Update ticket
  async updateTicket(id: number, data: UpdateTicketData, organization_id?: number) {
    const where: Prisma.SupportTicketWhereUniqueInput = { id };
    if (organization_id) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.update({
      where,
      data,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        }
      }
    });
  }

  // Add response to ticket
  async addTicketResponse(data: CreateTicketResponseData) {
    return await prisma.ticketResponse.create({
      data,
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            organization_id: true
          }
        }
      }
    });
  }

  // Get ticket responses
  async getTicketResponses(ticket_id: number, include_internal = false) {
    const where: Prisma.TicketResponseWhereInput = { ticket_id };
    if (!include_internal) {
      where.is_internal = false;
    }

    return await prisma.ticketResponse.findMany({
      where,
      orderBy: {
        created_at: 'asc'
      }
    });
  }

  // Get tickets count by status for dashboard
  async getTicketStats(organization_id?: number) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (organization_id) {
      where.organization_id = organization_id;
    }

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.OPEN } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.IN_PROGRESS } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.RESOLVED } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.CLOSED } })
    ]);

    return {
      total,
      open,
      in_progress: inProgress,
      resolved,
      closed
    };
  }

  // Get recent tickets for dashboard
  async getRecentTickets(organization_id?: number, limit = 5) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (organization_id) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });
  }

  // Delete ticket (soft delete by closing)
  async deleteTicket(id: number, organization_id?: number) {
    const where: Prisma.SupportTicketWhereUniqueInput = { id };
    if (organization_id) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.update({
      where,
      data: {
        status: TicketStatus.CLOSED,
        resolved_at: new Date()
      }
    });
  }
}

export const supportTicketRepository = new SupportTicketRepository();
