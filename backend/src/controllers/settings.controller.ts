import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSettings.findFirst({
      where: { id: 'default' }
    });

    if (!settings) {
      const defaultSettings = await prisma.systemSettings.create({
        data: {
          id: 'default',
          cardNumberLength: 5,
          renewalStartDay: 1
        }
      });
      return res.json(defaultSettings);
    }

    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const { cardNumberLength, renewalStartDay } = req.body;
  
  // Add validation
  if (renewalStartDay < 1 || renewalStartDay > 30) {
    return res.status(400).json({ error: 'Renewal start day must be between 1 and 30' });
  }

  if (cardNumberLength < 1 || cardNumberLength > 10) {
    return res.status(400).json({ error: 'Card number length must be between 1 and 10' });
  }

  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: { 
        cardNumberLength,
        renewalStartDay,
        updatedAt: new Date(),
        updatedBy: req.user?.id?.toString() || null // Add user ID if available in request
      },
      create: {
        id: 'default',
        cardNumberLength,
        renewalStartDay
      }
    });
    
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
};