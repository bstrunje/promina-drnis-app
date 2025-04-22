import { Request, Response } from 'express';
import cardNumberRepository from '../repositories/cardnumber.repository.js';
import auditService from '../services/audit.service.js';
import prisma from "../utils/prisma.js";

const cardNumberController = {
  // Get all available card numbers
  async getAvailable(req: Request, res: Response): Promise<void> {
    console.log("Fetching available card numbers - user role:", req.user?.role);
    try {
      const availableNumbers = await cardNumberRepository.getAvailable();
      console.log(`Found ${availableNumbers.length} available card numbers:`, availableNumbers);
      
      // Always return an array
      res.json(availableNumbers || []);
    } catch (error) {
      console.error('Error fetching available card numbers:', error);
      res.status(500).json({
        message: 'Failed to fetch available card numbers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Add a single card number
  async addSingle(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.body;
      
      if (!cardNumber || typeof cardNumber !== 'string') {
        res.status(400).json({ message: 'Valid card number is required' });
        return;
      }
      
      // Get current card number length setting
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" }
      });
      
      const cardNumberLength = settings?.cardNumberLength || 5;
      
      // Validate card number format
      if (cardNumber.length !== cardNumberLength) {
        res.status(400).json({ 
          message: `Card number must be ${cardNumberLength} characters long` 
        });
        return;
      }
      
      await cardNumberRepository.addSingle(cardNumber);
      
      await auditService.logAction(
        'CARD_NUMBER_ADDED',
        req.user?.id || null,
        `Added card number: ${cardNumber}`,
        req,
        'success'
      );
      
      res.status(201).json({ message: 'Card number added successfully' });
    } catch (error) {
      console.error('Error adding card number:', error);
      res.status(500).json({ message: 'Failed to add card number' });
    }
  },
  
  // Add a range of card numbers
  async addRange(req: Request, res: Response): Promise<void> {
    try {
      const { start, end } = req.body;
      
      if (typeof start !== 'number' || typeof end !== 'number') {
        res.status(400).json({ message: 'Valid start and end numbers are required' });
        return;
      }
      
      if (start > end) {
        res.status(400).json({ message: 'Start must be less than or equal to end' });
        return;
      }
      
      if (end - start > 1000) {
        res.status(400).json({ message: 'Cannot add more than 1000 card numbers at once' });
        return;
      }
      
      // Get current card number length setting
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" }
      });
      
      const cardNumberLength = settings?.cardNumberLength || 5;
      
      const added = await cardNumberRepository.addRange(start, end, cardNumberLength);
      
      await auditService.logAction(
        'CARD_NUMBER_RANGE_ADDED',
        req.user?.id || null,
        `Added card number range: ${start} to ${end} (${added} added)`,
        req,
        'success'
      );
      
      res.status(201).json({ message: `${added} card numbers added successfully` });
    } catch (error) {
      console.error('Error adding card number range:', error);
      res.status(500).json({ message: 'Failed to add card number range' });
    }
  },

  // Delete a card number
  async deleteCardNumber(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      
      if (!cardNumber) {
        res.status(400).json({ message: 'Card number is required' });
        return;
      }
      
      const deleted = await cardNumberRepository.deleteCardNumber(cardNumber);
      
      if (!deleted) {
        res.status(404).json({ message: 'Card number not found or already assigned to a member' });
        return;
      }
      
      await auditService.logAction(
        'CARD_NUMBER_DELETED',
        req.user?.id || null,
        `Deleted card number: ${cardNumber}`,
        req,
        'success'
      );
      
      res.status(200).json({ 
        message: 'Card number deleted successfully',
        cardNumber 
      });
    } catch (error) {
      console.error('Error deleting card number:', error);
      res.status(500).json({ message: 'Failed to delete card number' });
    }
  },

  // Add this method to the controller
  async getAllCardNumbers(req: Request, res: Response): Promise<void> {
    console.log("Fetching all card numbers - user role:", req.user?.role);
    try {
      const allCardNumbers = await cardNumberRepository.getAllCardNumbers();
      
      // Count statistics
      const available = allCardNumbers.filter(card => card.status === 'available').length;
      const assigned = allCardNumbers.filter(card => card.status === 'assigned').length;
      const total = allCardNumbers.length;
      
      console.log(`Found ${total} card numbers (${available} available, ${assigned} assigned)`);
      
      res.json({
        cards: allCardNumbers,
        stats: { 
          total,
          available,
          assigned
        }
      });
    } catch (error) {
      console.error('Error fetching all card numbers:', error);
      res.status(500).json({
        message: 'Failed to fetch card numbers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Nova metoda za sinkronizaciju statusa brojeva iskaznica
  async syncCardNumberStatus(req: Request, res: Response): Promise<void> {
    try {
      // Potrebna je admin/superuser razina pristupa
      if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
        res.status(403).json({ message: 'Unauthorized. Only admins and superusers can sync card number status.' });
        return;
      }

      console.log("Starting card number status synchronization...");
      
      // Pozovi metodu u repozitoriju koja će sinkronizirati statuse
      const result = await cardNumberRepository.syncCardNumberStatus();
      
      // Logiraj operaciju
      await auditService.logAction(
        'SYNC_CARD_NUMBER_STATUS',
        req.user?.id || null,
        `Synchronized card number status. Updated ${result.updated} records.`,
        req,
        'success'
      );
      
      res.status(200).json({ 
        message: 'Card number status synchronized successfully',
        updated: result.updated
      });
    } catch (error) {
      console.error('Error syncing card number status:', error);
      res.status(500).json({ 
        message: 'Failed to sync card number status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export default cardNumberController;
