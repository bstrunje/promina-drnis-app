// backend/src/controllers/organization.controller.ts
import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';
import { tOrDefault } from '../utils/i18n.js';

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
  const locale = req.locale || 'hr';

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
      ethics_code_url,
      privacy_policy_url,
      membership_rules_url,
      
      // System Manager data
      sm_username,
      sm_email,
      sm_display_name,
      sm_password
    } = req.body;

    // Validacija obaveznih polja
    if (!name || !subdomain || !email) {
      res.status(400).json({ 
        error: tOrDefault('organization.errors.missingFields', locale, 'Missing required fields: name, subdomain, email') 
      });
      return;
    }

    if (!sm_username || !sm_email || !sm_display_name || !sm_password) {
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
          ethics_code_url: ethics_code_url || null,
          privacy_policy_url: privacy_policy_url || null,
          membership_rules_url: membership_rules_url || null,
          logo_path: null, // Logo će biti uploadan kasnije
          is_active: true
        }
      });

      // 2. Kreiraj System Manager za novu organizaciju
      const hashedPassword = await bcrypt.hash(sm_password, 10);
      const systemManager = await tx.systemManager.create({
        data: {
          organization_id: organization.id,
          username: sm_username,
          email: sm_email,
          display_name: sm_display_name,
          password_hash: hashedPassword
        }
      });

      // 3. Seed inicijalne podatke
      await seedActivityTypes(tx, organization.id);
      await seedSkills(tx, organization.id);
      await seedSystemSettings(tx, organization.id);

      return { organization, systemManager };
    });

    console.log(`[CREATE-ORG] Organization created: ${name} (ID: ${result.organization.id})`);

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
        }
      }
    });

    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ organization });
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
  const locale = req.locale || 'hr';

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
      ethics_code_url,
      privacy_policy_url,
      membership_rules_url,
      is_active
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
        ethics_code_url: ethics_code_url !== undefined ? ethics_code_url : existing.ethics_code_url,
        privacy_policy_url: privacy_policy_url !== undefined ? privacy_policy_url : existing.privacy_policy_url,
        membership_rules_url: membership_rules_url !== undefined ? membership_rules_url : existing.membership_rules_url,
        is_active: is_active !== undefined ? is_active : existing.is_active,
        updated_at: new Date()
      }
    });

    console.log(`[UPDATE-ORG] Organization updated: ${updated.name} (ID: ${updated.id})`);

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
  const locale = req.locale || 'hr';

  try {
    const organizationId = parseInt(req.params.id);

    if (isNaN(organizationId)) {
      res.status(400).json({ error: 'Invalid organization ID' });
      return;
    }

    // Provjeri da organizacija postoji
    const existing = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });

    if (!existing) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    // Provjeri da organizacija nema članove (sigurnosna mjera)
    if (existing._count.members > 0) {
      res.status(400).json({ 
        error: tOrDefault('organization.errors.hasMembers', locale, 'Cannot delete organization with members') 
      });
      return;
    }

    // Obriši organizaciju (CASCADE će obrisati sve povezane podatke)
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

/**
 * Seed default activity types za novu organizaciju
 */
async function seedActivityTypes(tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, organizationId: number): Promise<void> {
  const defaultTypes = [
    { key: 'izleti', name: 'Izleti', description: 'Planinarski izleti' },
    { key: 'akcije', name: 'Akcije', description: 'Radne akcije' },
    { key: 'tecajevi', name: 'Tečajevi', description: 'Edukacijski tečajevi' },
    { key: 'dezurstva', name: 'Dežurstva', description: 'Dežurstva u domu' },
    { key: 'ostalo', name: 'Ostalo', description: 'Ostale aktivnosti' }
  ];

  for (const type of defaultTypes) {
    await tx.activityType.create({
      data: {
        organization_id: organizationId,
        key: type.key,
        name: type.name,
        description: type.description
      }
    });
  }

  console.log(`[SEED] Created ${defaultTypes.length} activity types for organization ${organizationId}`);
}

/**
 * Seed default skills za novu organizaciju
 */
async function seedSkills(tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, organizationId: number): Promise<void> {
  const defaultSkills = [
    { key: 'first_aid', name: 'Prva pomoć' },
    { key: 'navigation', name: 'Orijentacija' },
    { key: 'climbing', name: 'Penjanje' },
    { key: 'skiing', name: 'Skijanje' },
    { key: 'mountaineering', name: 'Alpinizam' },
    { key: 'rescue', name: 'Spašavanje' },
    { key: 'weather', name: 'Meteorologija' },
    { key: 'flora_fauna', name: 'Flora i fauna' },
    { key: 'photography', name: 'Fotografija' },
    { key: 'cooking', name: 'Kuhanje' }
  ];

  for (const skill of defaultSkills) {
    await tx.skill.create({
      data: {
        organization_id: organizationId,
        key: skill.key,
        name: skill.name
      }
    });
  }

  console.log(`[SEED] Created ${defaultSkills.length} skills for organization ${organizationId}`);
}

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
      timeZone: 'Europe/Zagreb'
    }
  });

  console.log(`[SEED] Created system settings for organization ${organizationId}`);
}
