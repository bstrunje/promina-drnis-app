import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

/**
 * @desc    Dohvaća sve vještine
 * @route   GET /api/skills
 * @access  Public (za sada, kasnije će možda trebati autentifikacija)
 */
export const getAllSkills = async (req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: {
        id: 'asc', // Sortiramo po ID-u da redoslijed bude konzistentan
      },
    });
    res.status(200).json(skills);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja vještina:', error);
    res.status(500).json({ message: 'Greška prilikom dohvaćanja vještina' });
  }
};
