import express from 'express';
import { getAllSkills, getUsedSkills } from '../controllers/skillController.js';

const router = express.Router();

// Ruta za dohvaćanje svih vještina
router.get('/', getAllSkills);

// Ruta za dohvaćanje samo korištenih vještina
router.get('/used', getUsedSkills);

export default router;
