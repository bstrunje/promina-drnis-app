// backend/src/controllers/organization.controller.ts
import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';
import { tOrDefault } from '../utils/i18n.js';
import { put, del } from '@vercel/blob';
import path from 'path';
import fs from 'fs/promises';
import { getUploadsDir, isBlobConfigured } from '../utils/uploads.js';
import { seedSkills, seedActivityTypes } from '../../prisma/seed.js';
import { clearOrganizationCache } from '../middleware/tenant.middleware.js';

// Upload konfiguracija (ista logika kao za profile images)
const isDev = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';
const hasVercelBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
const useVercelBlob = isProduction && hasVercelBlobToken;
// Centralizirani uploads direktorij (dosljedan s app.ts)
const uploadsDir = getUploadsDir();

// Helper za kreiranje direktorija
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Provjera dostupnosti subdomene
 * GET /api/system-manager/organizations/check-subdomain
 */
export const checkSubdomainAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subdomain } = req.query;

    if (!subdomain || typeof subdomain !== 'string') {
      res.status(400).json({ error: 'Subdomain is required' });
      return;
    }

    // Provjeri format subdomene (lowercase, brojevi, crtice)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      res.status(400).json({ 
        error: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.' 
      });
      return;
    }

    // Provjeri dostupnost
    const existing = await prisma.organization.findUnique({
      where: { subdomain }
    });

    res.json({ 
      available: !existing,
      subdomain 
    });
  } catch (error) {
    console.error('[CHECK-SUBDOMAIN] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Kreiranje nove organizacije
 * POST /api/system-manager/organizations
 */
export const createOrganization = async (req: Request, res: Response): Promise<void> => {
  const locale = req.locale;

  try {
    const {
      // Organization data
      name,
      short_name,
      subdomain,
      email,
      phone,
      website_url,
      street_address,
      city,
      postal_code,
      country,
      primary_color,
      secondary_color,
      default_language,
      ethics_code_url,
      privacy_policy_url,
      membership_rules_url,
      
      // System Manager data
      sm_username,
      sm_email,
      sm_display_name,
      
      // System Manager 2FA data
      sm_enable_2fa,
      sm_pin
    } = req.body;

    // Validacija obaveznih polja
    if (!name || !subdomain || !email) {
      res.status(400).json({ 
        error: tOrDefault('organization.errors.missingFields', locale, 'Missing required fields: name, subdomain, email') 
      });
      return;
    }

    if (!sm_username || !sm_email || !sm_display_name) {
      res.status(400).json({ 
        error: tOrDefault('organization.errors.missingSystemManager', locale, 'Missing System Manager data') 
      });
      return;
    }

    // Provjeri format subdomene
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      res.status(400).json({ 
        error: tOrDefault('organization.errors.invalidSubdomain', locale, 'Invalid subdomain format') 
      });
      return;
    }

    // Provjeri dostupnost subdomene
    const existingOrg = await prisma.organization.findUnique({
      where: { subdomain }
    });

    if (existingOrg) {
      res.status(400).json({ 
        error: tOrDefault('organization.errors.subdomainTaken', locale, 'Subdomain already exists') 
      });
      return;
    }

    // Transakcija - sve ili ništa
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kreiraj organizaciju
      const organization = await tx.organization.create({
        data: {
          name,
          short_name: short_name || name,
          subdomain,
          email,
          phone: phone || null,
          website_url: website_url || null,
          street_address: street_address || null,
          city: city || null,
          postal_code: postal_code || null,
          country: country || 'Hrvatska',
          primary_color: primary_color || '#2563eb',
          secondary_color: secondary_color || '#64748b',
          default_language: default_language || 'hr',
          ethics_code_url: ethics_code_url || null,
          privacy_policy_url: privacy_policy_url || null,
          membership_rules_url: membership_rules_url || null,
          logo_path: null, // Logo će biti uploadan kasnije
          
          // PWA podaci - automatski generirani iz osnovnih podataka
          pwa_name: name,
          pwa_short_name: short_name || name,
          pwa_theme_color: primary_color || '#2563eb',
          pwa_background_color: '#ffffff',
          // Default PWA ikone (dok se ne uploada logo)
          pwa_icon_192_url: '/pwa/icons/icon-192x192.png',
          pwa_icon_512_url: '/pwa/icons/icon-512x512.png',
          
          is_active: true
        }
      });

      // 2. Kreiraj System Manager za novu organizaciju
      // Uvijek koristi default lozinku "manager123" - OSM će morati promijeniti pri prvom logiranju
      const defaultPassword = 'manager123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // Pripremi 2FA podatke
      let twoFactorData = {};
      if (sm_enable_2fa && sm_pin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(sm_pin, salt);
        twoFactorData = {
          two_factor_enabled: true,
          two_factor_secret: hashedPin,
          two_factor_preferred_channel: 'pin',
          two_factor_confirmed_at: new Date()
        };
      }
      
      const systemManager = await tx.systemManager.create({
        data: {
          organization_id: organization.id,
          username: sm_username,
          email: sm_email,
          display_name: sm_display_name,
          password_hash: hashedPassword,
          password_reset_required: true, // Obavezna promjena lozinke pri prvom logiranju
          ...twoFactorData
        }
      });

      // 3. Seed inicijalne podatke (koristi funkcije iz prisma/seed.ts)
      await seedActivityTypes(tx, organization.id);
      await seedSkills(tx, organization.id);
      await seedSystemSettings(tx, organization.id);

      return { organization, systemManager };
    });

    console.log(`[CREATE-ORG] Organization created: ${name} (ID: ${result.organization.id})`);

    // Očisti cache da bi nova organizacija odmah bila dostupna
    clearOrganizationCache();
    console.log(`[CREATE-ORG] Organization cache cleared`);

    res.status(201).json({
      success: true,
      organization: result.organization,
      message: tOrDefault('organization.success.created', locale, `Organization ${name} created successfully`)
    });
  } catch (error) {
    console.error('[CREATE-ORG] Error:', error);
    res.status(500).json({ 
      error: tOrDefault('organization.errors.createFailed', locale, 'Failed to create organization') 
    });
  }
};

/**
 * Dohvat svih organizacija (samo za globalnog SM)
 * GET /api/system-manager/organizations
 */
export const getAllOrganizations = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            members: true,
            activities: true
          }
        }
      }
    });

    res.json({ organizations });
  } catch (error) {
    console.error('[GET-ALL-ORGS] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Dohvat pojedinačne organizacije
 * GET /api/system-manager/organizations/:id
 */
export const getOrganizationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = parseInt(req.params.id);

    if (isNaN(organizationId)) {
      res.status(400).json({ error: 'Invalid organization ID' });
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
            activities: true,
            activity_types: true,
            skills: true
          }
        },
        system_managers: {
          where: {
            organization_id: organizationId // Dohvati samo org-specific SM
          },
          select: {
            id: true,
            username: true,
            email: true,
            display_name: true,
            two_factor_enabled: true,
            two_factor_preferred_channel: true,
            two_factor_confirmed_at: true
            // password_hash se ne vraća iz sigurnosnih razloga
          }
        }
      }
    });

    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    // Dodaj system_manager podatke u root response (prvi SM za tu org)
    const systemManager = organization.system_managers[0] || null;

    res.json({ 
      organization: {
        ...organization,
        system_manager: systemManager
      }
    });
  } catch (error) {
    console.error('[GET-ORG] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Ažuriranje organizacije
 * PUT /api/system-manager/organizations/:id
 */
export const updateOrganization = async (req: Request, res: Response): Promise<void> => {
  const locale = req.locale;

  try {
    const organizationId = parseInt(req.params.id);

    if (isNaN(organizationId)) {
      res.status(400).json({ error: 'Invalid organization ID' });
      return;
    }

    const {
      name,
      short_name,
      email,
      phone,
      website_url,
      street_address,
      city,
      postal_code,
      country,
      primary_color,
      secondary_color,
      default_language,
      ethics_code_url,
      privacy_policy_url,
      membership_rules_url,
      is_active,
      // System Manager data (optional)
      sm_username,
      sm_email,
      sm_display_name,
      sm_password
    } = req.body;

    // Provjeri da organizacija postoji
    const existing = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    // Ažuriraj organizaciju
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: name || existing.name,
        short_name: short_name !== undefined ? short_name : existing.short_name,
        email: email || existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        website_url: website_url !== undefined ? website_url : existing.website_url,
        street_address: street_address !== undefined ? street_address : existing.street_address,
        city: city !== undefined ? city : existing.city,
        postal_code: postal_code !== undefined ? postal_code : existing.postal_code,
        country: country !== undefined ? country : existing.country,
        primary_color: primary_color || existing.primary_color,
        secondary_color: secondary_color || existing.secondary_color,
        default_language: default_language || existing.default_language,
        ethics_code_url: ethics_code_url !== undefined ? ethics_code_url : existing.ethics_code_url,
        privacy_policy_url: privacy_policy_url !== undefined ? privacy_policy_url : existing.privacy_policy_url,
        membership_rules_url: membership_rules_url !== undefined ? membership_rules_url : existing.membership_rules_url,
        is_active: is_active !== undefined ? is_active : existing.is_active,
        updated_at: new Date()
      }
    });

    // Ažuriraj System Manager podatke ako su proslijeđeni
    if (sm_username || sm_email || sm_display_name || sm_password) {
      const systemManager = await prisma.systemManager.findFirst({
        where: { organization_id: organizationId }
      });

      if (systemManager) {
        const updateData: {
          username?: string;
          email?: string;
          display_name?: string;
          password_hash?: string;
        } = {};
        if (sm_username) updateData.username = sm_username;
        if (sm_email) updateData.email = sm_email;
        if (sm_display_name) updateData.display_name = sm_display_name;
        if (sm_password) {
          updateData.password_hash = await bcrypt.hash(sm_password, 10);
        }

        await prisma.systemManager.update({
          where: { id: systemManager.id },
          data: updateData
        });

        console.log(`[UPDATE-ORG] System Manager updated for organization ${organizationId}`);
      }
    }

    console.log(`[UPDATE-ORG] Organization updated: ${updated.name} (ID: ${updated.id})`);

    // Očisti cache da bi novi language odmah bio vidljiv
    clearOrganizationCache();
    console.log(`[UPDATE-ORG] Organization cache cleared`);

    res.json({
      success: true,
      organization: updated,
      message: tOrDefault('organization.success.updated', locale, 'Organization updated successfully')
    });
  } catch (error) {
    console.error('[UPDATE-ORG] Error:', error);
    res.status(500).json({ 
      error: tOrDefault('organization.errors.updateFailed', locale, 'Failed to update organization') 
    });
  }
};

/**
 * Brisanje organizacije (samo za globalnog SM)
 * DELETE /api/system-manager/organizations/:id
 */
export const deleteOrganization = async (req: Request, res: Response): Promise<void> => {
  const locale = req.locale;

  try {
    const organizationId = parseInt(req.params.id);

    if (isNaN(organizationId)) {
      res.status(400).json({ error: 'Invalid organization ID' });
      return;
    }

    // Provjeri da organizacija postoji
    const existing = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    // Obriši logo ako postoji
    if (existing.logo_path) {
      try {
        if (existing.logo_path.startsWith('https://')) {
          // Vercel Blob - obriši s Blob storage-a
          await del(existing.logo_path);
          console.log(`[DELETE-ORG] Logo deleted from Vercel Blob: ${existing.logo_path}`);
        } else if (existing.logo_path.startsWith('/uploads')) {
          // Lokalni disk - obriši file
          const filePath = path.join(uploadsDir, existing.logo_path.replace('/uploads', ''));
          await fs.unlink(filePath);
          console.log(`[DELETE-ORG] Logo deleted from local disk: ${filePath}`);
        }
      } catch (logoErr) {
        console.warn(`[DELETE-ORG] Warning: Could not delete logo:`, logoErr);
        // Nastavi s brisanjem organizacije čak i ako logo nije obrisan
      }
    }

    // Obriši organizaciju
    // CASCADE će obrisati SVE povezane podatke:
    // - članove (members)
    // - aktivnosti (activities)
    // - system manager-e
    // - skills, activity_types, system_settings
    // - kartice, poruke, audit logs, itd.
    await prisma.organization.delete({
      where: { id: organizationId }
    });

    console.log(`[DELETE-ORG] Organization deleted: ${existing.name} (ID: ${organizationId})`);

    res.json({
      success: true,
      message: tOrDefault('organization.success.deleted', locale, 'Organization deleted successfully')
    });
  } catch (error) {
    console.error('[DELETE-ORG] Error:', error);
    res.status(500).json({ 
      error: tOrDefault('organization.errors.deleteFailed', locale, 'Failed to delete organization') 
    });
  }
};

// ============================================================================
// SEED FUNKCIJE ZA NOVU ORGANIZACIJU
// ============================================================================
// NAPOMENA: seedActivityTypes i seedSkills su importane iz prisma/seed.ts
// kako bi se izbjegla duplikacija koda i održavala konzistentnost

/**
 * Seed default system settings za novu organizaciju
 */
async function seedSystemSettings(tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, organizationId: number): Promise<void> {
  await tx.systemSettings.create({
    data: {
      organization_id: organizationId,
      renewalStartDay: 31,
      renewalStartMonth: 10, // Listopad
      cardNumberLength: 5,
      dutyCalendarEnabled: false,
      dutyMaxParticipants: 2,
      dutyAutoCreateEnabled: true,
      membershipTerminationDay: 1,
      membershipTerminationMonth: 3,
      timeZone: 'Europe/Zagreb',
      // Registracijski rate limit defaulti
      registrationRateLimitEnabled: true,
      registrationWindowMs: 60 * 60 * 1000, // 1h
      registrationMaxAttempts: 5
    }
  });

  console.log(`[SEED] Created system settings for organization ${organizationId}`);
}

/**
 * Upload logo organizacije
 * POST /api/system-manager/organizations/:id/logo
 */
export const uploadOrganizationLogo = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: 'Logo file is required' });
    return;
  }

  const { id } = req.params;
  const organizationId = parseInt(id, 10);

  try {
    // Produkcija bez Bloba: fail-fast (trajnost nije osigurana)
    if (isProduction && !isBlobConfigured()) {
      res.status(503).json({ message: 'Blob storage not configured. Logo upload is disabled in production.' });
      return;
    }
    if (isDev) console.log(`[LOGO-UPLOAD] Starting logo upload for organization ${id}`);
    if (isDev) console.log(`[LOGO-UPLOAD] File: ${req.file.originalname}, size: ${req.file.size} bytes`);

    // Dohvati organizaciju
    const organization = await prisma.organization.findUnique({ 
      where: { id: organizationId } 
    });

    if (!organization) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    let logoPath: string;

    if (useVercelBlob) {
      if (isDev) console.log(`[LOGO-UPLOAD] Using Vercel Blob...`);

      // Obriši stari logo s Vercel Blob-a
      if (organization.logo_path && organization.logo_path.includes('vercel-storage.com')) {
        try {
          await del(organization.logo_path);
          if (isDev) console.log(`[LOGO-UPLOAD] Old logo deleted from Vercel Blob`);
        } catch (delError) {
          if (isDev) console.warn(`[LOGO-UPLOAD] Warning: Could not delete old logo from Vercel Blob:`, delError);
        }
      }

      const fileName = `organization-logos/${organizationId}-${Date.now()}-${req.file.originalname}`;
      const blob = await put(fileName, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
      });

      logoPath = blob.url;
      if (isDev) console.log(`[LOGO-UPLOAD] Logo uploaded to Vercel Blob: ${logoPath}`);
    } else {
      if (isDev) console.log(`[LOGO-UPLOAD] Using local uploads folder...`);

      // Kreiraj organization_logos direktorij
      const logosDir = path.join(uploadsDir, 'organization_logos');
      await ensureDirectoryExists(logosDir);

      // Obriši stari logo s lokalnog diska
      if (organization.logo_path && organization.logo_path.startsWith('/uploads')) {
        try {
          const oldFilePath = path.join(uploadsDir, organization.logo_path.replace('/uploads', ''));
          await fs.unlink(oldFilePath);
          if (isDev) console.log(`[LOGO-UPLOAD] Old logo deleted from local disk: ${oldFilePath}`);
        } catch (delError) {
          if (isDev) console.warn(`[LOGO-UPLOAD] Warning: Could not delete old logo from local disk:`, delError);
        }
      }

      // Generiraj ime datoteke
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `org-${organizationId}-${Date.now()}${fileExtension}`;
      const filePath = path.join(logosDir, fileName);

      // Spremi datoteku
      await fs.writeFile(filePath, req.file.buffer);

      logoPath = `/uploads/organization_logos/${fileName}`;
      if (isDev) console.log(`[LOGO-UPLOAD] Logo saved locally: ${filePath}`);
      if (isDev) console.log(`[LOGO-UPLOAD] Relative path: ${logoPath}`);
    }

    // Ažuriraj bazu s logo i PWA ikonama
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: { 
        logo_path: logoPath,
        // Koristi logo za PWA ikone (iste kao logo)
        pwa_icon_192_url: logoPath,
        pwa_icon_512_url: logoPath
      },
    });

    if (isDev) console.log(`[LOGO-UPLOAD] Database updated for organization ${id}`);

    res.json({ 
      success: true, 
      logo_path: updatedOrganization.logo_path,
      message: 'Logo uploaded successfully' 
    });
  } catch (error) {
    console.error(`[LOGO-UPLOAD] Error uploading logo for organization ${id}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to upload logo';
    res.status(500).json({ message });
  }
};

/**
 * Brisanje logo organizacije
 * DELETE /api/system-manager/organizations/:id/logo
 */
export const deleteOrganizationLogo = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const organizationId = parseInt(id, 10);

  try {
    if (isDev) console.log(`[LOGO-DELETE] Starting logo deletion for organization ${id}`);

    const organization = await prisma.organization.findUnique({ 
      where: { id: organizationId } 
    });

    if (!organization) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    if (!organization.logo_path) {
      res.status(404).json({ message: 'Organization has no logo' });
      return;
    }

    // Obriši logo s storage-a
    if (organization.logo_path.includes('vercel-storage.com')) {
      try {
        await del(organization.logo_path);
        if (isDev) console.log(`[LOGO-DELETE] Logo deleted from Vercel Blob`);
      } catch (delError) {
        if (isDev) console.warn(`[LOGO-DELETE] Warning: Could not delete logo from Vercel Blob:`, delError);
      }
    } else if (organization.logo_path.startsWith('/uploads')) {
      try {
        const filePath = path.join(uploadsDir, organization.logo_path.replace('/uploads', ''));
        await fs.unlink(filePath);
        if (isDev) console.log(`[LOGO-DELETE] Logo deleted from local disk: ${filePath}`);
      } catch (delError) {
        if (isDev) console.warn(`[LOGO-DELETE] Warning: Could not delete logo from local disk:`, delError);
      }
    }

    // Ažuriraj bazu - vrati default PWA ikone
    await prisma.organization.update({
      where: { id: organizationId },
      data: { 
        logo_path: null,
        // Vrati default PWA ikone kada se obriše logo
        pwa_icon_192_url: '/pwa/icons/icon-192x192.png',
        pwa_icon_512_url: '/pwa/icons/icon-512x512.png'
      },
    });

    if (isDev) console.log(`[LOGO-DELETE] Database updated for organization ${id}`);

    res.json({ 
      success: true, 
      message: 'Logo deleted successfully' 
    });
  } catch (error) {
    console.error(`[LOGO-DELETE] Error deleting logo for organization ${id}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to delete logo';
    res.status(500).json({ message });
  }
};
