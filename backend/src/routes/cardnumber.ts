import express from 'express';
import cardNumberController from '../controllers/cardnumber.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Based on the error messages, it seems your authMiddleware is not an object with methods,
// but a function that needs to be called directly and may have different usage

// Get available card numbers (available to admin and superuser)
router.get(
  '/available', 
  authMiddleware, // Use it directly as middleware
  cardNumberController.getAvailable
);

// Add a single card number (admin or superuser only)
router.post(
  '/', 
  authMiddleware, 
  cardNumberController.addSingle
);

// Add a range of card numbers (admin or superuser only)
router.post(
  '/range', 
  authMiddleware, 
  cardNumberController.addRange
);

// Add this endpoint for deleting individual card numbers
router.delete(
  '/:cardNumber', 
  authMiddleware, 
  cardNumberController.deleteCardNumber
);

// Route za dohvat svih brojeva iskaznica (GET /api/card-numbers)
router.get(
  '/', 
  authMiddleware, 
  cardNumberController.getAllCardNumbers
);

// Route for syncing card number status
router.post(
  '/sync',
  authMiddleware,
  cardNumberController.syncCardNumberStatus
);

// Ruta za dohvat potrošenih kartica (samo admin/superuser)
router.get(
  '/consumed',
  authMiddleware,
  cardNumberController.getConsumedCardNumbers
);

export default router;
