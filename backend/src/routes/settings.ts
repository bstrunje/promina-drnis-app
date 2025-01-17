import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/card-length', async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findFirst();
    return res.json({ cardNumberLength: settings?.cardNumberLength ?? 5 });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/card-length', authMiddleware, roles.requireAdmin, async (req, res) => {
  const { length } = req.body;
  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: { cardNumberLength: length },
      create: { id: 'default', cardNumberLength: length, renewalStartDay: 1 }
    });
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;