// backend/src/middleware/systemManager.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware za provjeru da je korisnik GLOBALNI System Manager
 * (organization_id = null)
 * 
 * Koristi se za operacije koje samo globalni SM može raditi:
 * - Kreiranje novih organizacija
 * - Pregled svih organizacija
 * - Brisanje organizacija
 */
export const requireGlobalSystemManager = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Provjeri da je korisnik uopće autentificiran
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required' 
      });
      return;
    }

    // Provjeri da je korisnik System Manager
    if (req.user.user_type !== 'SystemManager') {
      res.status(403).json({ 
        error: 'Access denied. System Manager required.' 
      });
      return;
    }

    // Dohvati System Manager iz baze da provjeriš organization_id
    const prisma = (await import('../utils/prisma.js')).default;
    const systemManager = await prisma.systemManager.findUnique({
      where: { id: req.user.id },
      select: { organization_id: true }
    });

    if (!systemManager) {
      res.status(401).json({ 
        error: 'System Manager not found' 
      });
      return;
    }

    // Provjeri da je GLOBALNI System Manager (organization_id = null)
    if (systemManager.organization_id !== null) {
      res.status(403).json({ 
        error: 'Access denied. Global System Manager required. You can only manage your own organization.' 
      });
      return;
    }

    // Sve provjere prošle - nastavi
    next();
  } catch (error) {
    console.error('[GLOBAL-SM-MIDDLEWARE] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authorization' 
    });
  }
};

/**
 * Middleware za provjeru da je korisnik bilo koji System Manager
 * (globalni ili org-specific)
 * 
 * Koristi se za operacije koje bilo koji SM može raditi:
 * - Ažuriranje svoje organizacije
 * - Pregled svoje organizacije
 */
export const requireSystemManager = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Provjeri da je korisnik uopće autentificiran
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required' 
      });
      return;
    }

    // Provjeri da je korisnik System Manager
    if (req.user.user_type !== 'SystemManager') {
      res.status(403).json({ 
        error: 'Access denied. System Manager required.' 
      });
      return;
    }

    // Sve provjere prošle - nastavi
    next();
  } catch (error) {
    console.error('[SM-MIDDLEWARE] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authorization' 
    });
  }
};

/**
 * Middleware za provjeru da System Manager može pristupiti određenoj organizaciji
 * - Globalni SM može pristupiti svim organizacijama
 * - Org-specific SM može pristupiti samo svojoj organizaciji
 */
export const requireOrganizationAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.user_type !== 'SystemManager') {
      res.status(403).json({ error: 'Access denied. System Manager required.' });
      return;
    }

    // Dohvati organization_id iz URL parametara
    const requestedOrgId = parseInt(req.params.id || req.params.organizationId || '0');
    
    if (!requestedOrgId || isNaN(requestedOrgId)) {
      res.status(400).json({ error: 'Invalid organization ID' });
      return;
    }

    // Dohvati System Manager iz baze
    const prisma = (await import('../utils/prisma.js')).default;
    const systemManager = await prisma.systemManager.findUnique({
      where: { id: req.user.id },
      select: { organization_id: true }
    });

    if (!systemManager) {
      res.status(401).json({ error: 'System Manager not found' });
      return;
    }

    // Globalni SM može pristupiti svim organizacijama
    if (systemManager.organization_id === null) {
      next();
      return;
    }

    // Org-specific SM može pristupiti samo svojoj organizaciji
    if (systemManager.organization_id !== requestedOrgId) {
      res.status(403).json({ 
        error: 'Access denied. You can only access your own organization.' 
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[ORG-ACCESS-MIDDLEWARE] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authorization' 
    });
  }
};
