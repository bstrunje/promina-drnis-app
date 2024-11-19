import express from 'express';
import { validateRegistration, validateLogin } from '../middleware/validators.js';
import authController from '../controllers/auth.controller.js';

const router = express.Router();

// Explicitly type the route handlers
router.post(
	'/register', 
	validateRegistration, 
	(req, res) => authController.registerInitial(req, res)
);				 

router.post(
	'/login', 
	validateLogin, 
	(req, res) => authController.login(req, res)
);
 
 export default router;