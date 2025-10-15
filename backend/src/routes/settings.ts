import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import { updateSettings } from '../controllers/settings.controller.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';

const router = Router();

// Nova općenita GET ruta za dohvat svih postavki
router.get('/', async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const settings = await prisma.systemSettings.findFirst({
      where: { organization_id: organizationId }
    });

    if (!settings) {
      const defaultSettings = await prisma.systemSettings.create({
        data: {
          organization_id: organizationId,
          cardNumberLength: 5,
          renewalStartDay: 1,
          renewalStartMonth: 11
        }
      });
      return res.json(defaultSettings);
    }

    return res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Add new PUT route for general settings
router.put('/', authMiddleware, roles.requireSystemManager, updateSettings);

// Postojeće rute
router.get('/card-length', async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const settings = await prisma.systemSettings.findFirst({
      where: { organization_id: organizationId }
    });
    return res.json({ cardNumberLength: settings?.cardNumberLength ?? 5 });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/card-length', authMiddleware, roles.requireSystemManager, async (req, res) => {
  const { length } = req.body;
  try {
    const organizationId = getOrganizationId(req);
    const settings = await prisma.systemSettings.upsert({
      where: { organization_id: organizationId },
      update: { cardNumberLength: length },
      create: { 
        organization_id: organizationId,
        cardNumberLength: length,
        renewalStartDay: 1,
        renewalStartMonth: 11
      }
    });
    return res.json(settings);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;