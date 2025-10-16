// backend/src/routes/auth.ts
import express from 'express';
import { validateRegistration, validateLogin } from '../middleware/validators.js';
import authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js'; // OPTIMIZACIJA: Dodano za Prisma ORM
import { createRateLimit, createTenantAwareRegistrationRateLimit } from '../middleware/rateLimit.js';

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

const registerRateLimit = createTenantAwareRegistrationRateLimit();

// Public routes with rate limiting
router.post('/register', registerRateLimit, validateRegistration, authController.registerMember);
router.post('/login', loginRateLimit, validateLogin, authController.login);

// Protected search - zahtijeva autentikaciju (koristi se za slanje poruka)
router.get('/search-members', authMiddleware, searchRateLimit, authController.searchMembers);

// Nove rute za refresh token mehanizam
// Koristimo iste putanje koje očekuje frontend
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// 2FA rate limiters
const twoFaSetupRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many 2FA setup attempts, please try again later' }
});
const twoFaVerifyRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many 2FA verification attempts, please try again later' }
});
const twoFaInitOtpRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP requests, please try again later' }
});
const twoFaDisableRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many disable attempts, please try again later' }
});

// 2FA endpoints
router.post('/2fa/setup/init', authMiddleware, twoFaSetupRateLimit, authController.twoFaInitSetup);
router.post('/2fa/setup/confirm', authMiddleware, twoFaSetupRateLimit, authController.twoFaConfirmSetup);
router.post('/2fa/verify', twoFaVerifyRateLimit, authController.twoFaVerify);
router.post('/2fa/disable', authMiddleware, twoFaDisableRateLimit, authController.twoFaDisable);
router.post('/2fa/init-otp', twoFaInitOtpRateLimit, authController.twoFaInitOtp);

// Health check endpoint za provjeru valjanosti tokena
router.get('/health', authMiddleware, (req, res) => {
  // Ako smo došli do ovdje, token je valjan
  res.json({ 
    status: 'ok', 
    authenticated: true,
    user: req.user ? {
      member_id: req.user.member_id,
      role: req.user.role
    } : null
  });
});

// Very simple direct debug endpoint for quicker testing
router.get('/debug-member/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`Debug request for ID: ${id}`);
    
    const member = await prisma.member.findUnique({
      where: { member_id: id }
    });
    
    if (!member) {
      console.log(`No member found with ID ${id}`);
      return res.status(404).json({ message: 'Member not found' });
    }
    
    // Return minimal data with password hash length only
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