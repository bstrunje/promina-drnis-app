// backend/src/routes/auth.ts
import express from 'express';
import { validateRegistration, validateLogin } from '../middleware/validators.js';
import authController from '../controllers/auth.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import db from '../utils/db.js'; // Full direct path, no @ symbol
import { createRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Create specific rate limiters for auth endpoints
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,  // 10 attempts per IP in 15 minutes
  message: { error: "Too many login attempts, please try again later" }
});

const searchRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 20,  // 20 searches per IP in 5 minutes
  message: { error: "Too many search attempts, please try again later" }
});

const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,  // 5 registration attempts per IP in 1 hour
  message: { error: "Too many registration attempts, please try again later" }
});

// Public routes with rate limiting
router.post('/register', registerRateLimit, validateRegistration, authController.registerMember);
router.post('/login', loginRateLimit, validateLogin, authController.login);
router.get('/search-members', searchRateLimit, authController.searchMembers);

// Very simple direct debug endpoint for quicker testing
router.get('/debug-member/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`Debug request for ID: ${id}`);
    
    // Simple raw query to avoid any potential issues
    const result = await db.query('SELECT * FROM members WHERE member_id = $1', [id]);
    
    if (result.rowCount === 0) {
      console.log(`No member found with ID ${id}`);
      return res.status(404).json({ message: 'Member not found' });
    }
    
    // Return minimal data with password hash length only
    const member = result.rows[0];
    return res.json({
      debug: true,
      member_id: member.member_id,
      full_name: member.full_name, 
      status: member.status,
      has_password: !!member.password_hash,
      password_hash_length: member.password_hash?.length || 0
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

export default router;