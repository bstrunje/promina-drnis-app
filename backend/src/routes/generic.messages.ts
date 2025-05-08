import express from 'express';
import { createMessage, getMessages, getMessage, deleteMessage } from '../controllers/message.controller.js';

const router = express.Router();

// Generic messaging endpoints
router.post('/', createMessage);
router.get('/', getMessages);
router.get('/:id', getMessage);
router.delete('/:id', deleteMessage);

export default router;
