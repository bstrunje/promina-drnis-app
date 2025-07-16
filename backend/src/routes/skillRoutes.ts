import express from 'express';
import { getAllSkills } from '../controllers/skillController.js';

const router = express.Router();

// Ruta za dohvaćanje svih vještina
router.get('/', getAllSkills);

export default router;
