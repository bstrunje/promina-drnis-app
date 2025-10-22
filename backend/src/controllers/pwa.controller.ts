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

    // PWA manifest mora koristiti frontend origin, ne backend origin
    // U lokalnom razvoju: frontend (5173) poziva backend (3000/3001) preko proxy-ja
    // U produkciji: sve je na istoj domeni
    const referer = req.get('referer') || req.get('origin');
    let frontendOrigin: string;
    
    if (referer) {
      // Izvuci origin iz referer-a (http://localhost:5173/promina/login -> http://localhost:5173)
      const refererUrl = new URL(referer);
      frontendOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
    } else {
      // Fallback na backend origin (produkcija)
      frontendOrigin = `${req.protocol}://${req.get('host')}`;
    }
    
    console.log('[PWA] organization.logo_path:', organization.logo_path);
    console.log('[PWA] referer:', referer);
    console.log('[PWA] frontend origin:', frontendOrigin);
    
    // Logo URL-ovi trebaju koristiti backend origin za slike
    const backendOrigin = `${req.protocol}://${req.get('host')}`;
    const logoUrl = organization.logo_path
      ? `${backendOrigin}${organization.logo_path}`
      : null;
    
    // Ako tenant ima logo, koristi ga za sve veličine
    // Inače koristi fallback ikone odgovarajućih veličina
    const icon512 = organization.pwa_icon_512_url 
      || logoUrl 
      || `${frontendOrigin}/pwa/icons/icon-512x512.png`;
    
    const icon192 = organization.pwa_icon_192_url 
      || logoUrl 
      || `${frontendOrigin}/pwa/icons/icon-192x192.png`;
    
    const icon256 = logoUrl || `${frontendOrigin}/pwa/icons/icon-256x256.png`;
    const icon128 = logoUrl || `${frontendOrigin}/pwa/icons/icon-128x128.png`;

    // Start URL i scope moraju koristiti frontend origin
    const startUrl = `${frontendOrigin}/${organization.subdomain}/login`;
    const scopeUrl = `${frontendOrigin}/${organization.subdomain}/`;
    const appId = `/${organization.subdomain}/login`;

    // Generiraj manifest s iOS podrškom
    const manifest = {
      id: appId,
      name: organization.pwa_name || organization.name,
      short_name: organization.pwa_short_name || organization.short_name || organization.name.substring(0, 12),
      description: `Aplikacija za članove ${organization.name}`,
      start_url: startUrl,
      scope: scopeUrl,
      display: 'standalone',
      background_color: organization.pwa_background_color || '#ffffff',
      theme_color: organization.pwa_theme_color || organization.primary_color || '#0066cc',
      orientation: 'portrait',
      // Ikone - ako je tenant logo, ne specificiraj veličinu (browser će resize-ati)
      icons: logoUrl ? [
        // Tenant logo - browser će automatski resize-ati
        {
          src: logoUrl,
          sizes: 'any',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: logoUrl,
          sizes: 'any',
          type: 'image/png',
          purpose: 'maskable'
        }
      ] : [
        // Fallback ikone - specificiraj točne veličine
        {
          src: icon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: icon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: icon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: icon256,
          sizes: '256x256',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: icon128,
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any'
        }
      ],
      // Screenshot-ovi za richer PWA install UI (trenutno placeholder-i)
      screenshots: [
        {
          src: `${frontendOrigin}/pwa/screenshots/mobile-screenshot.png`,
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'narrow'
        },
        {
          src: `${frontendOrigin}/pwa/screenshots/desktop-screenshot.png`,
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'wide'
        }
      ],
      // PWA kategorija
      categories: ['productivity', 'business']
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
