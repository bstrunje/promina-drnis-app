import { supportTicketRepository, CreateTicketData, UpdateTicketData, TicketFilters, CreateTicketResponseData } from '../repositories/supportTicket.repository.js';
import auditService from './audit.service.js';
import { TicketStatus } from '@prisma/client';

class SupportTicketService {
  // Create new support ticket
  async createTicket(data: CreateTicketData, performerId: number) {
    try {
      const ticket = await supportTicketRepository.createTicket(data);

      // Log audit trail
      await auditService.logAction(
        'SUPPORT_TICKET_CREATED',
        performerId,
        `Created support ticket: ${ticket.title} (Category: ${ticket.category})`,
        undefined,
        'success',
        undefined,
        'SYSTEM_MANAGER',
        data.organization_id
      );

      return ticket;
    } catch (error) {
      console.error('[SUPPORT] Error creating ticket:', error);
      throw new Error('Failed to create support ticket');
    }
  }

  // Get ticket by ID
  async getTicketById(id: number, organization_id?: number | null) {
    try {
      const ticket = await supportTicketRepository.getTicketById(id, organization_id);
      
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      return ticket;
    } catch (error) {
      console.error('[SUPPORT] Error fetching ticket:', error);
      throw error;
    }
  }

  // Get tickets with filters
  async getTickets(filters: TicketFilters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const result = await supportTicketRepository.getTickets(filters, limit, offset);

      return {
        tickets: result.tickets,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      };
    } catch (error) {
      console.error('[SUPPORT] Error fetching tickets:', error);
      throw new Error('Failed to fetch support tickets');
    }
  }

  // Update ticket
  async updateTicket(id: number, data: UpdateTicketData, performerId: number, organization_id?: number | null) {
    try {
      // If status is being changed to resolved, set resolved_at
      if (data.status === TicketStatus.RESOLVED && !data.resolved_at) {
        data.resolved_at = new Date();
      }

      const ticket = await supportTicketRepository.updateTicket(id, data, organization_id);

      // Log audit trail
      const changes = Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      await auditService.logAction(
        'SUPPORT_TICKET_UPDATED',
        performerId,
        `Updated support ticket #${id}: ${changes}`,
        undefined,
        'success',
        undefined,
        'SYSTEM_MANAGER',
        organization_id || ticket.organization_id
      );

      return ticket;
    } catch (error) {
      console.error('[SUPPORT] Error updating ticket:', error);
      throw new Error('Failed to update support ticket');
    }
  }

  // Add response to ticket
  async addTicketResponse(data: CreateTicketResponseData, performerId: number) {
    try {
      const response = await supportTicketRepository.addTicketResponse(data);

      // Log audit trail
      await auditService.logAction(
        'SUPPORT_TICKET_RESPONSE_ADDED',
        performerId,
        `Added response to support ticket #${data.ticket_id}${data.is_internal ? ' (internal note)' : ''}`,
        undefined,
        'success',
        undefined,
        'SYSTEM_MANAGER',
        response.ticket.organization_id
      );

      return response;
    } catch (error) {
      console.error('[SUPPORT] Error adding ticket response:', error);
      throw new Error('Failed to add ticket response');
    }
  }

  // Get ticket responses
  async getTicketResponses(ticket_id: number, include_internal = false) {
    try {
      return await supportTicketRepository.getTicketResponses(ticket_id, include_internal);
    } catch (error) {
      console.error('[SUPPORT] Error fetching ticket responses:', error);
      throw new Error('Failed to fetch ticket responses');
    }
  }

  // Get ticket statistics for dashboard
  async getTicketStats(organization_id?: number | null) {
    try {
      return await supportTicketRepository.getTicketStats(organization_id);
    } catch (error) {
      console.error('[SUPPORT] Error fetching ticket stats:', error);
      throw new Error('Failed to fetch ticket statistics');
    }
  }

  // Get recent tickets for dashboard
  async getRecentTickets(organization_id?: number | null, limit = 5) {
    try {
      return await supportTicketRepository.getRecentTickets(organization_id, limit);
    } catch (error) {
      console.error('[SUPPORT] Error fetching recent tickets:', error);
      throw new Error('Failed to fetch recent tickets');
    }
  }

  // Close ticket
  async closeTicket(id: number, performerId: number, organization_id?: number | null) {
    try {
      const ticket = await supportTicketRepository.updateTicket(
        id,
        { 
          status: TicketStatus.CLOSED,
          resolved_at: new Date()
        },
        organization_id
      );

      // Log audit trail
      await auditService.logAction(
        'SUPPORT_TICKET_CLOSED',
        performerId,
        `Closed support ticket #${id}: ${ticket.title}`,
        undefined,
        'success',
        undefined,
        'SYSTEM_MANAGER',
        organization_id || ticket.organization_id
      );

      return ticket;
    } catch (error) {
      console.error('[SUPPORT] Error closing ticket:', error);
      throw new Error('Failed to close support ticket');
    }
  }

  // Assign ticket to GSM
  async assignTicket(id: number, assigned_to: number, performerId: number, organization_id?: number | null) {
    try {
      const ticket = await supportTicketRepository.updateTicket(
        id,
        { 
          assigned_to,
          status: TicketStatus.IN_PROGRESS
        },
        organization_id
      );

      // Log audit trail
      await auditService.logAction(
        'SUPPORT_TICKET_ASSIGNED',
        performerId,
        `Assigned support ticket #${id} to GSM ID ${assigned_to}`,
        undefined,
        'success',
        undefined,
        'SYSTEM_MANAGER',
        organization_id || ticket.organization_id
      );

      return ticket;
    } catch (error) {
      console.error('[SUPPORT] Error assigning ticket:', error);
      throw new Error('Failed to assign support ticket');
    }
  }

  // Get my tickets (for organization SM)
  async getMyTickets(created_by: number, organization_id: number | null, page = 1, limit = 20) {
    try {
      const filters: TicketFilters = {
        created_by,
        organization_id
      };

      return await this.getTickets(filters, page, limit);
    } catch (error) {
      console.error('[SUPPORT] Error fetching my tickets:', error);
      throw new Error('Failed to fetch your tickets');
    }
  }

  // Get all tickets (for GSM)
  async getAllTickets(page = 1, limit = 20, filters: Partial<TicketFilters> = {}) {
    try {
      return await this.getTickets(filters, page, limit);
    } catch (error) {
      console.error('[SUPPORT] Error fetching all tickets:', error);
      throw new Error('Failed to fetch all tickets');
    }
  }
}

export const supportTicketService = new SupportTicketService();
