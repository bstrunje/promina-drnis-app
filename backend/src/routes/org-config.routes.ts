/**
 * PUBLIC ORGANIZATION CONFIG API
 * 
 * Javni endpoint koji vraća osnovne informacije o organizaciji
 * na temelju subdomene. Koristi se za:
 * - Frontend konfiguraciju (boje, logo, naziv)
 * - SEO meta tagove
 * - Branding informacije
 * 
 * Endpoint: GET /api/org-config
 */

import { Router, Request, Response } from 'express';
import { tenantMiddleware, getOrganization } from '../middleware/tenant.middleware.js';

const router = Router();

/**
 * GET /api/org-config
 * Vraća javne informacije o organizaciji
 */
router.get('/org-config', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const organization = getOrganization(req);

    // Javne informacije o organizaciji
    const orgConfig = {
      id: organization.id,
      name: organization.name,
      short_name: organization.short_name,
      subdomain: organization.subdomain,
      
      // Branding
      logo_path: organization.logo_path || null,
      primary_color: organization.primary_color || '#0066cc',
      secondary_color: organization.secondary_color || '#1e40af',
      
      // Kontakt informacije
      email: organization.email || null,
      phone: organization.phone || null,
      website_url: organization.website_url || null,
      
      // Adresa
      street_address: organization.street_address || null,
      city: organization.city || null,
      postal_code: organization.postal_code || null,
      country: organization.country || 'Hrvatska',
      
      // Dokumenti (javni URL-ovi)
      ethics_code_url: organization.ethics_code_url || null,
      privacy_policy_url: organization.privacy_policy_url || null,
      membership_rules_url: organization.membership_rules_url || null,
      
      // Status
      is_active: organization.is_active
    };

    res.json({
      success: true,
      data: orgConfig
    });

  } catch (error) {
    console.error('[ORG-CONFIG] Greška:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju konfiguracije organizacije'
    });
  }
});

/**
 * GET /api/org-config/branding
 * Vraća samo branding informacije (optimizirano za frontend)
 */
router.get('/org-config/branding', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const organization = getOrganization(req);

    const branding = {
      name: organization.name,
      short_name: organization.short_name,
      logo_path: organization.logo_path || null,
      primary_color: organization.primary_color || '#0066cc',
      secondary_color: organization.secondary_color || '#1e40af'
    };

    res.json({
      success: true,
      data: branding
    });

  } catch (error) {
    console.error('[ORG-CONFIG-BRANDING] Greška:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju branding informacija'
    });
  }
});

export default router;
