// backend/src/routes/auth.ts
import express from 'express';
import { validateRegistration, validateLogin } from '../middleware/validators.js';
import authController from '../controllers/auth.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import db from '../utils/db.js'; // Full direct path, no @ symbol

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, authController.registerMember);
router.post('/login', validateLogin, authController.login);
router.get('/search-members', authController.searchMembers);

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