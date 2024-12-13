// backend/src/controllers/hours.controller.ts
import { Request, Response } from 'express';
import Hours from '../models/hours.model';

const getAllHours = async (req: Request, res: Response) => {
  try {
    const hours = await Hours.findAll();
    res.json(hours);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hours' });
  }
};

export default {
  getAllHours,
};