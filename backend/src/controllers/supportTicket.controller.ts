import { Request, Response } from 'express';
import { supportTicketService } from '../services/supportTicket.service.js';
import { TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';
import { getOrganizationId } from '../middleware/tenant.middleware.js';

// Create new support ticket
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { title, description, category, priority } = req.body;
    const organization_id = getOrganizationId(req);
    const created_by = req.user?.id;

    if (!created_by) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validation
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    if (!Object.values(TicketCategory).includes(category)) {
      return res.status(400).json({ error: 'Invalid ticket category' });
    }

    if (priority && !Object.values(TicketPriority).includes(priority)) {
      return res.status(400).json({ error: 'Invalid ticket priority' });
    }

    const ticketData = {
      title: title.trim(),
      description: description.trim(),
      category: category as TicketCategory,
      priority: (priority as TicketPriority) || TicketPriority.MEDIUM,
      organization_id,
      created_by
    };

    const ticket = await supportTicketService.createTicket(ticketData, created_by);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('[SUPPORT] Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
};

// Get ticket by ID
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organization_id = getOrganizationId(req);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticketId = parseInt(id);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    // For organization SM, filter by organization_id
    // For GSM, allow access to all tickets
    const filterByOrg = user.role !== 'global_system_manager' ? organization_id : undefined;

    const ticket = await supportTicketService.getTicketById(ticketId, filterByOrg);

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('[SUPPORT] Get ticket error:', error);
    if (error instanceof Error && error.message === 'Support ticket not found') {
      return res.status(404).json({ error: 'Support ticket not found' });
    }
    res.status(500).json({ error: 'Failed to fetch support ticket' });
  }
};

// Get tickets list
export const getTickets = async (req: Request, res: Response) => {
  try {
    const organization_id = getOrganizationId(req);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as TicketStatus;
    const category = req.query.category as TicketCategory;
    const priority = req.query.priority as TicketPriority;

    const filters: Record<string, unknown> = {};

    // For organization SM, only show their organization's tickets
    if (user.role !== 'global_system_manager') {
      filters.organization_id = organization_id;
    }

    // Apply additional filters
    if (status && Object.values(TicketStatus).includes(status)) {
      filters.status = status;
    }
    if (category && Object.values(TicketCategory).includes(category)) {
      filters.category = category;
    }
    if (priority && Object.values(TicketPriority).includes(priority)) {
      filters.priority = priority;
    }

    const result = await supportTicketService.getTickets(filters, page, limit);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[SUPPORT] Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
};

// Get my tickets (for organization SM)
export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const organization_id = getOrganizationId(req);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await supportTicketService.getMyTickets(user.id, organization_id, page, limit);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[SUPPORT] Get my tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch your tickets' });
  }
};

// Update ticket
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to } = req.body;
    const organization_id = getOrganizationId(req);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticketId = parseInt(id);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const updateData: Record<string, unknown> = {};

    if (status && Object.values(TicketStatus).includes(status)) {
      updateData.status = status;
    }
    if (priority && Object.values(TicketPriority).includes(priority)) {
      updateData.priority = priority;
    }
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    // For organization SM, filter by organization_id
    const filterByOrg = user.role !== 'global_system_manager' ? organization_id : undefined;

    const ticket = await supportTicketService.updateTicket(ticketId, updateData, user.id, filterByOrg);

    res.json({
      success: true,
      message: 'Support ticket updated successfully',
      ticket
    });
  } catch (error) {
    console.error('[SUPPORT] Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update support ticket' });
  }
};

// Add response to ticket
export const addTicketResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { response_text, is_internal } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticket_id = parseInt(id);
    if (isNaN(ticket_id)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    if (!response_text || response_text.trim().length === 0) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    const responseData = {
      ticket_id,
      response_text: response_text.trim(),
      created_by: user.id,
      is_internal: is_internal || false
    };

    const response = await supportTicketService.addTicketResponse(responseData, user.id);

    res.status(201).json({
      success: true,
      message: 'Response added successfully',
      response
    });
  } catch (error) {
    console.error('[SUPPORT] Add response error:', error);
    res.status(500).json({ error: 'Failed to add response' });
  }
};

// Get ticket statistics
export const getTicketStats = async (req: Request, res: Response) => {
  try {
    const organization_id = getOrganizationId(req);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For organization SM, filter by organization_id
    const filterByOrg = user.role !== 'global_system_manager' ? organization_id : undefined;

    const stats = await supportTicketService.getTicketStats(filterByOrg);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[SUPPORT] Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket statistics' });
  }
};

// Close ticket
export const closeTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organization_id = getOrganizationId(req);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticketId = parseInt(id);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    // For organization SM, filter by organization_id
    const filterByOrg = user.role !== 'global_system_manager' ? organization_id : undefined;

    const ticket = await supportTicketService.closeTicket(ticketId, user.id, filterByOrg);

    res.json({
      success: true,
      message: 'Support ticket closed successfully',
      ticket
    });
  } catch (error) {
    console.error('[SUPPORT] Close ticket error:', error);
    res.status(500).json({ error: 'Failed to close support ticket' });
  }
};
