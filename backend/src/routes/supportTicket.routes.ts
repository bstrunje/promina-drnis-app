import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenant.middleware.js';
import {
  createTicket,
  getTicketById,
  getTickets,
  getMyTickets,
  updateTicket,
  addTicketResponse,
  getTicketStats,
  closeTicket
} from '../controllers/supportTicket.controller.js';

const router = Router();

// Apply tenant and auth middleware to all routes
router.use(requireTenant);
router.use(authMiddleware);

// Support ticket routes
router.post('/', createTicket);                    // Create new ticket
router.get('/stats', getTicketStats);              // Get ticket statistics
router.get('/my-tickets', getMyTickets);           // Get my tickets (org SM)
router.get('/', getTickets);                       // Get all tickets (with filters)
router.get('/:id', getTicketById);                 // Get ticket by ID
router.put('/:id', updateTicket);                  // Update ticket
router.post('/:id/responses', addTicketResponse);  // Add response to ticket
router.put('/:id/close', closeTicket);             // Close ticket

export default router;
