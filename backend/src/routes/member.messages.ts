import express from 'express';
import memberMessageController from '../controllers/member.message.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Member routes
router.post('/:memberId/messages', authMiddleware, memberMessageController.createMessage);
router.get('/:memberId/messages', authMiddleware, memberMessageController.getMemberMessages);

export default router;