// controllers/pwa.controller.ts
import { Request, Response } from 'express';
import { getOrganization } from '../middleware/tenant.middleware.js';

/**
 * Dinamički PWA manifest za svaku organizaciju
 * GET /:orgSlug/manifest.json ili GET /api/manifest?tenant=orgSlug
 */
export const getManifest = async (req: Request, res: Response): Promise<void> => {
  try {
    // Dohvati organizaciju iz tenant middleware
    const organization = getOrganization(req);
    
    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    // Generiraj ikone URLs
    // Ako org ima logo, koristi ga, inače fallback na default ikone
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Debug: provjeri što je u logo_path
    console.log('[PWA] organization.logo_path:', organization.logo_path);
    
    // logo_path u bazi je puni path s leading slash: "/uploads/organization_logos/..."
    const logoUrl = organization.logo_path
      ? `${baseUrl}${organization.logo_path}` // Samo dodaj baseUrl, path vec ima /uploads/
      : null;
    
    console.log('[PWA] Generated logoUrl:', logoUrl);
    
    const icon192 = organization.pwa_icon_192_url 
      || logoUrl 
      || `${baseUrl}/pwa/icons/icon-192x192.png`; // Fallback
    
    const icon512 = organization.pwa_icon_512_url 
      || logoUrl 
      || `${baseUrl}/pwa/icons/icon-512x512.png`; // Fallback

    // Start URL mora biti path-based
    const startUrl = `/${organization.subdomain}/login`;

    // Generiraj manifest
    const manifest = {
      name: organization.pwa_name || organization.name,
      short_name: organization.pwa_short_name || organization.short_name || organization.name.substring(0, 12),
      description: `Aplikacija za članove ${organization.name}`,
      start_url: startUrl,
      scope: `/${organization.subdomain}/`,
      display: 'standalone',
      background_color: organization.pwa_background_color || '#ffffff',
      theme_color: organization.pwa_theme_color || organization.primary_color || '#0066cc',
      orientation: 'portrait',
      icons: [
        {
          src: icon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: icon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        }
      ]
    };

    // Postavi cache headers
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 sat cache
    
    res.json(manifest);
  } catch (error) {
    console.error('[PWA] Error generating manifest:', error);
    res.status(500).json({ error: 'Failed to generate manifest' });
  }
};
