import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
// Removed unused type import: SystemSettings
import { validateSettings } from '../utils/validation.js';
import { sanitizeInput } from '../utils/sanitization.js';
import { createRateLimit } from '../middleware/rateLimit.js';
// Removed unused import: PerformerType
import auditService from '../services/audit.service.js';

const isDev = process.env.NODE_ENV === 'development';

// Tip proširenja `req.user` je centraliziran u `backend/src/global.d.ts`.

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
          renewalStartDay: 1,
          renewalStartMonth: 11
        }
      });
      return res.json(defaultSettings);
    }

    return res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ code: 'SETTINGS_FETCH_FAILED', error: 'Failed to fetch settings' });
  }
};

export const updateSettings = [
  createRateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  async (req: Request, res: Response) => {
    const { 
      cardNumberLength = 5, 
      renewalStartDay = 1, 
      renewalStartMonth = 11 
    } = req.body;

    if (isDev) console.log('Received settings update:', { cardNumberLength, renewalStartDay, renewalStartMonth });
    
    const sanitizedInput = sanitizeInput({ 
      cardNumberLength, 
      renewalStartDay, 
      renewalStartMonth 
    });

    if (isDev) console.log('Sanitized input:', sanitizedInput);

    const validationError = validateSettings(sanitizedInput);
    if (validationError) {
      return res.status(400).json({ code: 'SETTINGS_VALIDATION_ERROR', error: validationError });
    }

    if (!req.user) {
      return res.status(403).json({ code: 'AUTH_UNAUTHORIZED', error: 'Unauthorized' });
    }

    // Dozvoli pristup ako je korisnik SystemManager ILI member_superuser
    if (!req.user.is_SystemManager && req.user.role_name !== 'member_superuser') {
      return res.status(403).json({ code: 'SETTINGS_FORBIDDEN_UPDATE', error: 'Unauthorized to update settings' });
    }

    const user = req.user;

    try {
      await prisma.$transaction(async (prisma) => {
        const settings = await prisma.systemSettings.upsert({
          where: { id: 'default' },
          update: { 
            cardNumberLength: sanitizedInput.cardNumberLength!,
            renewalStartDay: sanitizedInput.renewalStartDay!,
            renewalStartMonth: sanitizedInput.renewalStartMonth!,
            updatedBy: user.id
          },
          create: {
            id: 'default',
            cardNumberLength: sanitizedInput.cardNumberLength!,
            renewalStartDay: sanitizedInput.renewalStartDay!,
            renewalStartMonth: sanitizedInput.renewalStartMonth!,
            updatedBy: user.id
          }
        });

        if (isDev) console.log('Updated settings:', settings);

        const changes = Object.fromEntries(
          Object.entries(sanitizedInput).filter(([_key, value]) => value !== undefined)
        );

        // Dodana dijagnostika za req.user (samo u razvojnom okruženju)
        if (isDev) console.log('DEBUG - req.user u settings.controller:', {
          id: req.user!.id,
          is_SystemManager: req.user!.is_SystemManager,
          role: req.user!.role,
          user_type: req.user!.user_type
        });

        const performerId = req.user!.id;
        
        // Logiranje promjene - ne prosljeđujemo performer_type, neka auditService sam odredi
        await auditService.logAction(
          'update',
          performerId,
          `Ažurirane sistemske postavke: ${Object.entries(changes).map(([key, value]) => `${key}: ${value}`).join(', ')}`,
          req,
          'success',
          undefined // affected_member
          // performer_type se neće prosljeđivati - auditService će koristiti getPerformerType
        );

        return res.json(settings);
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ code: 'SETTINGS_UPDATE_FAILED', error: 'Failed to update settings' });
    }
  }
];