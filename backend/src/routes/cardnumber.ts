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
  '/add', 
  authMiddleware, // Use it directly as middleware
  cardNumberController.addSingle
);

// Add a range of card numbers (admin or superuser only)
router.post(
  '/add-range', 
  authMiddleware, // Use it directly as middleware
  cardNumberController.addRange
);

// Add this endpoint for deleting individual card numbers
router.delete(
  '/:cardNumber', 
  authMiddleware, 
  cardNumberController.deleteCardNumber
);

// Add this route
router.get(
  '/all', 
  authMiddleware, 
  cardNumberController.getAllCardNumbers
);

export default router;
