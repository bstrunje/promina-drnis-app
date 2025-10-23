import prisma from '../utils/prisma.js';
import { TicketCategory, TicketStatus, TicketPriority, Prisma } from '@prisma/client';

// Tip za Prisma where input koji podržava null organization_id
type SupportTicketWhereInputWithNullOrg = Omit<Prisma.SupportTicketWhereInput, 'organization_id'> & {
  organization_id?: number | null;
};

type SupportTicketWhereUniqueInputWithNullOrg = Omit<Prisma.SupportTicketWhereUniqueInput, 'organization_id'> & {
  id: number;
  organization_id?: number | null;
};

export interface CreateTicketData {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  organization_id: number | null; // null za GSM tickete
  created_by: number;
}

export interface UpdateTicketData {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: number;
  resolved_at?: Date;
}

export interface TicketFilters {
  organization_id?: number | null;
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
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        organization_id: data.organization_id as number,
        created_by: data.created_by,
        status: TicketStatus.OPEN
      },
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
  async getTicketById(id: number, organization_id?: number | null) {
    const where: SupportTicketWhereUniqueInputWithNullOrg = { id };
    // Za Org SM dodaj organization_id filter, za GSM (null) ne dodavaj filter
    if (organization_id !== undefined && organization_id !== null) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.findUnique({
      where: where as Prisma.SupportTicketWhereUniqueInput,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        },
        creator: {
          select: {
            id: true,
            display_name: true,
            email: true
          }
        },
        responses: {
          select: {
            id: true,
            response_text: true,
            created_by: true,
            is_internal: true,
            created_at: true,
            creator: {
              select: {
                id: true,
                display_name: true,
                email: true
              }
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        }
      }
    });
  }

  // Get tickets with filters
  async getTickets(filters: TicketFilters = {}, limit = 50, offset = 0) {
    const where: SupportTicketWhereInputWithNullOrg = {};
    
    // Za GSM (organization_id = null), ne dodavaj organization_id filter
    // Za Org SM (organization_id = broj), dodaj filter
    if (filters.organization_id !== undefined && filters.organization_id !== null) {
      where.organization_id = filters.organization_id;
    }
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigned_to !== undefined) where.assigned_to = filters.assigned_to;
    if (filters.created_by) where.created_by = filters.created_by;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: where as Prisma.SupportTicketWhereInput,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              subdomain: true
            }
          },
          creator: {
            select: {
              id: true,
              display_name: true,
              email: true
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
      prisma.supportTicket.count({ where: where as Prisma.SupportTicketWhereInput })
    ]);

    return { tickets, total };
  }

  // Update ticket
  async updateTicket(id: number, data: UpdateTicketData, organization_id?: number | null) {
    const where: SupportTicketWhereUniqueInputWithNullOrg = { id };
    // Za Org SM dodaj organization_id filter, za GSM (null) ne dodavaj filter
    if (organization_id !== undefined && organization_id !== null) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.update({
      where: where as Prisma.SupportTicketWhereUniqueInput,
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
  async getTicketStats(organization_id?: number | null) {
    const where: SupportTicketWhereInputWithNullOrg = {};
    // Za GSM (organization_id = null), ne dodavaj organization_id filter
    // Za Org SM (organization_id = broj), dodaj filter
    if (organization_id !== undefined && organization_id !== null) {
      where.organization_id = organization_id;
    }

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where: where as Prisma.SupportTicketWhereInput }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.OPEN } as Prisma.SupportTicketWhereInput }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.IN_PROGRESS } as Prisma.SupportTicketWhereInput }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.RESOLVED } as Prisma.SupportTicketWhereInput }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.CLOSED } as Prisma.SupportTicketWhereInput })
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
  async getRecentTickets(organization_id?: number | null, limit = 5) {
    const where: SupportTicketWhereInputWithNullOrg = {};
    if (organization_id !== undefined) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.findMany({
      where: where as Prisma.SupportTicketWhereInput,
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
  async deleteTicket(id: number, organization_id?: number | null) {
    const where: SupportTicketWhereUniqueInputWithNullOrg = { id };
    if (organization_id !== undefined) {
      where.organization_id = organization_id;
    }

    return await prisma.supportTicket.update({
      where: where as Prisma.SupportTicketWhereUniqueInput,
      data: {
        status: TicketStatus.CLOSED,
        resolved_at: new Date()
      }
    });
  }
}

export const supportTicketRepository = new SupportTicketRepository();
