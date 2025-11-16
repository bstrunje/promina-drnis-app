// backend/src/routes/members.ts
import express, { Request, Response } from 'express';
import { put, del, list } from '@vercel/blob';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { memberController, getMemberDashboardStats } from '../controllers/member.controller.js';
import memberProfileController from '../controllers/memberProfile.controller.js';
import cardNumberController from '../controllers/cardnumber.controller.js';
import memberStatsController from '../controllers/memberStats.controller.js';
import memberMessageController from '../controllers/member.message.controller.js';
import { getPinStatus, setPin, removePin, resetMemberPin } from '../controllers/members/pinController.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import { pinResetRateLimit } from '../middleware/pinResetRateLimit.js';
import membershipController from '../controllers/membership.controller.js';
import prisma from '../utils/prisma.js';
import memberService, { updateMemberActivityHours } from '../services/member.service.js';
import stampService from '../services/stamp.service.js';
import membershipService from '../services/membership.service.js';
import equipmentService from '../services/equipment.service.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { PerformerType } from '@prisma/client';

const router = express.Router();

// Konfiguracija za Multer da koristi memoriju umjesto diska
const upload = multer({ storage: multer.memoryStorage() });

// KRITIČNA KONFIGURACIJA: Uvjetno korištenje lokalnih uploads vs Vercel Blob
const isProduction = process.env.NODE_ENV === 'production';
const hasVercelBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
const useVercelBlob = isProduction && hasVercelBlobToken;

// Konfiguracija uploads direktorija za lokalni razvoj
const uploadsDir = process.env.UPLOADS_DIR || (process.env.NODE_ENV === 'production'
  ? '/app/uploads' // Fallback za legacy ili non-disk setups
  : path.resolve(__dirname, '..', '..', 'uploads'));

const isDev = process.env.NODE_ENV === 'development';

if (isDev) console.log(`[UPLOAD] Konfiguracija:`);
if (isDev) console.log(`[UPLOAD] NODE_ENV: ${process.env.NODE_ENV}`);
if (isDev) console.log(`[UPLOAD] BLOB_READ_WRITE_TOKEN: ${hasVercelBlobToken ? 'postoji' : 'ne postoji'}`);
if (isDev) console.log(`[UPLOAD] useVercelBlob: ${useVercelBlob}`);
if (isDev) console.log(`[UPLOAD] uploadsDir: ${uploadsDir}`);

// Helper za kreiranje direktorija
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    if (isDev) console.log(`[UPLOAD] Kreiran direktorij: ${dirPath}`);
  }
}

/**
 * Validira da li profilna slika postoji na disku
 * Vraća true ako datoteka postoji, false inače
 */
async function validateProfileImageExists(imagePath: string, uploadsDir: string): Promise<boolean> {
  if (!imagePath || !imagePath.startsWith('/uploads')) {
    // Vercel Blob URL-ovi se ne mogu validirati lokalno
    return imagePath?.startsWith('https://') || false;
  }
  
  try {
    const fullPath = path.join(uploadsDir, imagePath.replace('/uploads', ''));
    await fs.access(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Public routes
// Dashboard statistike za običnog člana - stavljeno prije dinamičkih ruta da se ne poklopi s /:memberId
router.get('/dashboard/stats', authenticateToken, getMemberDashboardStats);
// Public router: izlaganje email-availability bez auth middleware-a
export const publicMembersRouter = express.Router();

// Izdvojeni handler kako bismo izbjegli dupliciranje logike
async function emailAvailabilityHandler(req: Request, res: Response): Promise<void> {
  try {
    const emailParam = req.query.email;
    const excludeParam = req.query.excludeMemberId;

    if (!emailParam || typeof emailParam !== 'string') {
      res.status(400).json({ code: 'EMAIL_REQUIRED', message: 'Parametar email je obavezan.' });
      return;
    }

    let organizationId: number;
    try {
      organizationId = getOrganizationId(req);
    } catch (_e) {
      res.status(400).json({ code: 'TENANT_REQUIRED', message: 'Organization context is required' });
      return;
    }

    const excludeId = typeof excludeParam === 'string' ? parseInt(excludeParam, 10) : NaN;

    const existing = await prisma.member.findFirst({
      where: {
        email: emailParam as string,
        organization_id: organizationId,
        ...(Number.isFinite(excludeId) ? { member_id: { not: excludeId } } : {})
      },
      select: { member_id: true }
    });

    const available = !existing;
    const response: { available: boolean; existingMemberId?: number } = { available };
    if (existing) response.existingMemberId = existing.member_id;
    res.json(response);
  } catch (error) {
    console.error('Email availability check error:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Greška prilikom provjere email dostupnosti.' });
  }
}

// GET /api/members/email-availability (PUBLIC)
publicMembersRouter.get('/email-availability', emailAvailabilityHandler);

// GET /api/members/:memberId/profile-image-v2 (PUBLIC - <img> tagovi ne šalju Authorization header)
publicMembersRouter.get('/:memberId/profile-image-v2', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);

    if (!Number.isFinite(memberId)) {
      console.log(`[PROFILE-IMAGE-PROXY] Invalid member ID: ${req.params.memberId}`);
      res.status(400).json({ message: 'Invalid member ID' });
      return;
    }

    // Tenant-aware dohvat člana: osiguraj da pripada trenutnoj organizaciji
    const organizationId = getOrganizationId(req);
    console.log(`[PROFILE-IMAGE-PROXY] Fetching image for member ${memberId}, org ${organizationId}`);

    const member = await prisma.member.findFirst({
      where: {
        member_id: memberId,
        organization_id: organizationId,
      },
      select: {
        profile_image_path: true,
      },
    });

    const imagePath = member?.profile_image_path ?? null;
    console.log(`[PROFILE-IMAGE-PROXY] Member found: ${!!member}, imagePath: ${imagePath}`);

    if (!member || !imagePath) {
      console.log(`[PROFILE-IMAGE-PROXY] 404 - Member or image not found`);
      res.status(404).json({ message: 'Profile image not found' });
      return;
    }

    // Ako je lokalna /uploads putanja, prepusti poslu statičkom serveru
    if (imagePath.startsWith('/uploads')) {
      res.redirect(imagePath);
      return;
    }

    // Za HTTPS (npr. Vercel Blob) napravi proxy preko Node https modula
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      https
        .get(imagePath, (blobRes) => {
          const statusCode = blobRes.statusCode ?? 500;

          if (statusCode >= 400) {
            res.status(statusCode).end();
            return;
          }

          const contentType = blobRes.headers['content-type'];
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }

          blobRes.pipe(res);
        })
        .on('error', (err) => {
          console.error('[PROFILE-IMAGE-PROXY] Error fetching image:', err);
          res.status(502).json({ message: 'Failed to fetch profile image' });
        });

      return;
    }

    res.status(400).json({ message: 'Unsupported profile image path format' });
  } catch (error) {
    console.error('[PROFILE-IMAGE-PROXY] Unexpected error:', error);
    res.status(500).json({ message: 'Failed to load profile image' });
  }
});

// Dohvat trenutno prijavljenog člana (u sklopu tenanta)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const currentId = req.user?.id;
    if (!currentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const me = await memberService.getMemberById(req, currentId);
    if (!me) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(me);
  } catch (error) {
    console.error('Error fetching current member (me):', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch current member' });
  }
});

// Rute za poruke koje moraju biti prije dinamičke /:memberId rute
router.get('/unread-count', authenticateToken, memberMessageController.getUnreadMessageCount);
router.get('/sent', authenticateToken, memberMessageController.getSentMessages);

// Lista svih članova - sanitizacija automatski skriva osjetljive podatke u Network tab-u
router.get('/', authenticateToken, memberController.getAllMembers);

// Napredni filteri rute (MORAJU BITI PRIJE '/:memberId' DA IH NE PREGLUSI DINAMICKA RUTA)
router.get(
  '/functions',
  authenticateToken,
  (req, _res, next) => {
    const orgId = (req as Request & { organizationId?: number }).organizationId;
    console.log(`[ROUTE] /members/functions hit, organizationId: ${orgId ?? 'undefined'}`);
    next();
  },
  memberController.getMembersWithFunctions
);
router.get('/skills/:skillName', authenticateToken, memberController.getMembersBySkill);

// Pojedinačni profil - sanitizacija automatski skriva osjetljive podatke osim za vlastiti profil
router.get('/:memberId', authenticateToken, memberController.getMemberById);
router.get('/:memberId/stats', authenticateToken, memberStatsController.getMemberStats);
router.get('/:memberId/annual-stats', authenticateToken, memberStatsController.getMemberAnnualStats);
router.get('/:memberId/activities', authenticateToken, memberStatsController.getMemberWithActivities);

// Rute za poruke vezane za određenog člana
router.post('/:memberId/messages', authenticateToken, memberMessageController.createMessage);
router.get('/:memberId/messages', authenticateToken, memberMessageController.getMemberMessages);
router.put('/:memberId/messages/:messageId/read', authenticateToken, memberMessageController.markMemberMessageAsRead);

// Protected routes
router.post('/', authenticateToken, roles.requireAdmin, memberProfileController.createMember);
router.put('/:memberId', authenticateToken, roles.requireAdmin, memberProfileController.updateMember);
// router.delete('/:memberId', authenticateToken, roles.requireSuperUser, memberController.deleteMember);
router.put('/:memberId/role', authenticateToken, roles.requireSuperUser, memberProfileController.updateMemberRole);

// Dodjela broja iskaznice i generiranje lozinke - preusmjereno na ispravan kontroler
router.post('/:memberId/card-number', authenticateToken, roles.requireAdmin, cardNumberController.assignCardNumber);

// Regeneriranje lozinke za RANDOM_8 strategiju
router.post('/:memberId/regenerate-password', authenticateToken, roles.requireAdmin, cardNumberController.regeneratePassword);

// For returning stamps to inventory - only superuser can do this
router.post("/:memberId/stamp/return", authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { forNextYear = false } = req.body; // Get parameter from request body
    
    // Get member details to determine stamp type
    const member = await memberService.getMemberById(req, memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    // Map life status to stamp type
    const stampType = 
      member.life_status === "employed/unemployed" ? "employed" :
      member.life_status === "child/pupil/student" ? "student" :
      member.life_status === "pensioner" ? "pensioner" : "employed";
    
    // Return stamp to inventory with the new parameter (tenant-aware)
    await stampService.returnStamp(req, stampType, memberId, forNextYear);
    
    // Update only for current year stamps (prisma limitation)
    if (!forNextYear) {
      // Ažuriraj samo u membership_details tablici jer card_stamp_issued više nije polje na Memberu
      await prisma.membershipDetails.update({
        where: { member_id: memberId },
        data: { card_stamp_issued: false }
      });

      // Re-kalkuliraj registration_completed za tekuću godinu nakon povrata markice
      const details = await prisma.membershipDetails.findUnique({
        where: { member_id: memberId },
        select: { card_number: true }
      });
      const performerId = req.user?.member_id;
      await membershipService.updateCardDetails(
        req,
        memberId,
        details?.card_number || undefined,
        false,
        performerId
      );
    } else {
      // Za markice za sljedeću godinu, ažuriraj membership_details tablicu
      await prisma.membershipDetails.update({
        where: { member_id: memberId },
        data: { next_year_stamp_issued: false }
      });
      if (isDev) console.log(`Returning next year stamp for member ${memberId} - Updated in database`);
    }
    
    // Get updated member to return in response
    const updatedMember = await memberService.getMemberById(req, memberId);
    
    res.json({ 
      message: forNextYear ? "Stamp for next year returned successfully" : "Stamp returned successfully",
      member: updatedMember
    });
  } catch (error) {
    console.error("Error returning stamp:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to return stamp" 
    });
  }
});

// Issue stamp to a member (current year by default, or next year when forNextYear=true)
router.post("/:memberId/stamp", authenticateToken, roles.requireAdmin, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { forNextYear = false } = req.body; // optional flag from client

    // Centralizirani tok: servis odrađuje inventar, membership_details i re-kalkulaciju za tekuću godinu
    const performerId = req.user?.member_id;
    const performerType: PerformerType = 'MEMBER';
    if (!performerId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await stampService.issueStampToMember(req, memberId, performerId, Boolean(forNextYear), performerType);

    // Return updated member to client
    const updatedMember = await memberService.getMemberById(req, memberId);

    res.json({
      message: forNextYear ? "Stamp for next year issued successfully" : "Stamp issued successfully",
      member: updatedMember
    });
  } catch (error) {
    console.error("Error issuing stamp:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to issue stamp"
    });
  }
});

// Equipment Management Routes
// Get equipment status for a member
router.get('/:memberId/equipment/status', authenticateToken, roles.requireAdmin, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const equipmentStatus = await equipmentService.getMemberEquipmentStatus(req, memberId);
    res.json(equipmentStatus);
  } catch (error) {
    console.error("Error fetching member equipment status:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to fetch equipment status" 
    });
  }
});

// Mark equipment as delivered to member
router.post('/:memberId/equipment/:type/deliver', authenticateToken, roles.requireAdmin, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const equipmentType = req.params.type;
    const performerId = req.user?.member_id;
    const performerType = 'MEMBER'; // Svi članovi su MEMBER bez obzira na ovlasti

    if (!performerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate equipment type
    if (!['tshirt', 'shell_jacket', 'hat'].includes(equipmentType)) {
      return res.status(400).json({ message: "Invalid equipment type" });
    }

    await equipmentService.markEquipmentAsDelivered(
      req,
      memberId, 
      equipmentType, 
      performerId, 
      performerType
    );

    // Get updated member to return in response
    const updatedMember = await memberService.getMemberById(req, memberId);
    
    res.json({ 
      message: `${equipmentType} marked as delivered successfully`,
      member: updatedMember
    });
  } catch (error) {
    console.error("Error marking equipment as delivered:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to mark equipment as delivered" 
    });
  }
});

// Unmark equipment as delivered (return to inventory)
router.post('/:memberId/equipment/:type/undeliver', authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const equipmentType = req.params.type;
    const performerId = req.user?.member_id;
    const performerType = 'MEMBER'; // Svi članovi su MEMBER bez obzira na ovlasti

    if (!performerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate equipment type
    if (!['tshirt', 'shell_jacket', 'hat'].includes(equipmentType)) {
      return res.status(400).json({ message: "Invalid equipment type" });
    }

    await equipmentService.unmarkEquipmentAsDelivered(
      req,
      memberId, 
      equipmentType, 
      performerId, 
      performerType
    );

    // Get updated member to return in response
    const updatedMember = await memberService.getMemberById(req, memberId);
    
    res.json({ 
      message: `${equipmentType} delivery unmarked successfully`,
      member: updatedMember
    });
  } catch (error) {
    console.error("Error unmarking equipment as delivered:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to unmark equipment as delivered" 
    });
  }
});

// Get equipment inventory status (admin only)
router.get('/equipment/inventory', authenticateToken, roles.requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    
    let inventoryStatus;
    if (type && typeof type === 'string') {
      inventoryStatus = await equipmentService.getInventoryStatusByType(req, type);
    } else {
      inventoryStatus = await equipmentService.getInventoryStatus(req);
    }
    
    res.json(inventoryStatus);
  } catch (error) {
    console.error("Error fetching equipment inventory:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to fetch equipment inventory" 
    });
  }
});

// Update equipment inventory (superuser only)
router.put('/equipment/inventory', authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const { equipment_type, size, gender, initial_count } = req.body;

    // Validate required fields
    if (!equipment_type || !size || !gender || initial_count === undefined) {
      return res.status(400).json({ 
        message: "Missing required fields: equipment_type, size, gender, initial_count" 
      });
    }

    // Validate equipment type
    if (!['tshirt', 'shell_jacket', 'hat'].includes(equipment_type)) {
      return res.status(400).json({ message: "Invalid equipment type" });
    }

    // Validate size
    if (!['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(size)) {
      return res.status(400).json({ message: "Invalid size" });
    }

    // Validate gender
    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    // Validate count
    if (typeof initial_count !== 'number' || initial_count < 0) {
      return res.status(400).json({ message: "Initial count must be a non-negative number" });
    }

    await equipmentService.updateInitialCount(req, equipment_type, size, gender, initial_count);
    
    // Get updated inventory to return in response
    const updatedInventory = await equipmentService.getInventoryStatusByType(req, equipment_type);
    
    res.json({ 
      message: "Equipment inventory updated successfully",
      inventory: updatedInventory
    });
  } catch (error) {
    console.error("Error updating equipment inventory:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to update equipment inventory" 
    });
  }
});

// Issue equipment as gift (admin or superuser)
router.post('/equipment/gift', authenticateToken, roles.requireAdmin, async (req, res) => {
  try {
    const { equipment_type, size, gender, notes } = req.body;
    const performerId = req.user?.member_id;
    const performerType = 'MEMBER'; // Svi članovi su MEMBER bez obzira na ovlasti

    if (!performerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate required fields
    if (!equipment_type || !size || !gender) {
      return res.status(400).json({ 
        message: "Missing required fields: equipment_type, size, gender" 
      });
    }

    // Validate equipment type
    if (!['tshirt', 'shell_jacket', 'hat'].includes(equipment_type)) {
      return res.status(400).json({ message: "Invalid equipment type" });
    }

    // Validate size
    if (!['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(size)) {
      return res.status(400).json({ message: "Invalid size" });
    }

    // Validate gender
    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    await equipmentService.issueEquipmentAsGift(
      req,
      equipment_type, 
      size, 
      gender, 
      performerId, 
      notes, 
      performerType
    );
    
    // Get updated inventory to return in response
    const updatedInventory = await equipmentService.getInventoryStatusByType(req, equipment_type);
    
    res.json({ 
      message: `${equipment_type} (${size}, ${gender}) issued as gift successfully`,
      inventory: updatedInventory
    });
  } catch (error) {
    console.error("Error issuing equipment as gift:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to issue equipment as gift" 
    });
  }
});

// DELETE endpoint za vraćanje gift equipment
router.delete('/equipment/gift', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { equipment_type, size, gender, notes } = req.body;
    const performerId = req.user?.member_id;
    const performerType = 'MEMBER';

    // Validate user authentication
    if (!performerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Validate required fields
    if (!equipment_type || !size || !gender) {
      return res.status(400).json({ message: "Missing required fields: equipment_type, size, gender" });
    }

    // Validate equipment_type
    if (!['tshirt', 'shell_jacket', 'hat'].includes(equipment_type)) {
      return res.status(400).json({ message: "Invalid equipment_type" });
    }

    // Validate size
    if (!['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(size)) {
      return res.status(400).json({ message: "Invalid size" });
    }

    // Validate gender
    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    await equipmentService.ungiftEquipment(
      req,
      equipment_type, 
      size, 
      gender, 
      performerId, 
      notes, 
      performerType
    );
    
    // Get updated inventory to return in response
    const updatedInventory = await equipmentService.getInventoryStatusByType(req, equipment_type);
    
    res.json({ 
      message: `${equipment_type} (${size}, ${gender}) gift returned to inventory successfully`,
      inventory: updatedInventory
    });
  } catch (error) {
    console.error("Error returning gift equipment:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to return gift equipment" 
    });
  }
});

// Get members with specific equipment (admin only)
router.get('/equipment/members/:equipmentType/:size/:gender', authenticateToken, roles.requireAdmin, async (req: Request, res: Response) => {
  try {
    const { equipmentType, size, gender } = req.params;

    // Validate equipment type
    if (!['tshirt', 'shell_jacket', 'hat'].includes(equipmentType)) {
      return res.status(400).json({ message: "Invalid equipment type" });
    }

    // Validate size
    if (!['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(size)) {
      return res.status(400).json({ message: "Invalid size" });
    }

    // Validate gender
    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    const members = await equipmentService.getMembersWithEquipment(equipmentType, size, gender);
    res.json(members);
  } catch (error) {
    console.error("Error fetching members with equipment:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to fetch members with equipment" 
    });
  }
});

/**
 * Čisti nevažeće profile_image_path-ove u bazi podataka
 * Ova funkcija se poziva prije svakog uploada da osigura konzistentnost
 */
async function cleanupInvalidProfileImages(memberId: number): Promise<void> {
  try {
    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      select: { profile_image_path: true }
    });

    if (!member) return;

    const needsUpdate = member.profile_image_path && 
      !await validateProfileImageExists(member.profile_image_path, uploadsDir);

    if (needsUpdate) {
      console.log(`[PROFILE-CLEANUP] Cleaning invalid profile image for member ${memberId}`);
      
      await prisma.member.update({
        where: { member_id: memberId },
        data: {
          profile_image_path: null,
          profile_image_updated_at: new Date()
        }
      });
      
      console.log(`[PROFILE-CLEANUP] Invalid profile image cleaned for member ${memberId}`);
    }
  } catch (error) {
    console.error(`[PROFILE-CLEANUP] Error cleaning profile image:`, error);
  }
}

// Rute za profilnu sliku - GET ruta je premještena u publicMembersRouter (gore)
// jer <img> tagovi ne šalju Authorization header i ne mogu proći kroz authMiddleware

// POST: upload profilne slike (Vercel Blob ili lokalni uploads)
router.post(
  '/:memberId/profile-image',
  authenticateToken,
  upload.single('image'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Slika nije priložena.' });
    }

    const { memberId } = req.params;
    const memberIdNum = parseInt(memberId, 10);

    try {
      if (isDev) console.log(`[UPLOAD] Početak upload-a slike za člana ${memberId}`);
      if (isDev) console.log(`[UPLOAD] Datoteka: ${req.file.originalname}, veličina: ${req.file.size} bytes`);
      
      // TRAJNO RJEŠENJE: Cleanup nevažećih profilnih slika prije uploada
      await cleanupInvalidProfileImages(memberIdNum);

      // Prvo obriši staru sliku ako postoji
      const member = await prisma.member.findUnique({ where: { member_id: memberIdNum } });
      
      let imagePath: string;
      
      if (useVercelBlob) {
        if (isDev) console.log(`[UPLOAD] Korištenje Vercel Blob za upload...`);
        
        // Obriši SVE stare slike za ovog člana s Vercel Blob-a
        try {
          const prefix = `profile-images/${memberId}-`;
          const { blobs } = await list({
            prefix,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          
          if (blobs.length > 0) {
            console.log(`[UPLOAD] Pronađeno ${blobs.length} starih slika za brisanje`);
            for (const blob of blobs) {
              await del(blob.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
              console.log(`[UPLOAD] Obrisana stara slika: ${blob.url}`);
            }
          } else {
            if (isDev) console.log(`[UPLOAD] Nema starih slika za brisanje`);
          }
        } catch (delError) {
          console.warn(`[UPLOAD] Upozorenje: Greška pri brisanju starih slika s Vercel Blob-a:`, delError);
        }
        
        const fileName = `profile-images/${memberId}-${Date.now()}-${req.file.originalname}`;
        
        // Debug logging za Vercel Blob
        console.log(`[UPLOAD] BLOB_READ_WRITE_TOKEN exists: ${!!process.env.BLOB_READ_WRITE_TOKEN}`);
        console.log(`[UPLOAD] Uploading profile image to Vercel Blob: ${fileName}`);
        
        try {
          const blob = await put(fileName, req.file.buffer, {
            access: 'public',
            contentType: req.file.mimetype,
            token: process.env.BLOB_READ_WRITE_TOKEN, // Eksplicitno proslijedi token
          });
          
          imagePath = blob.url;
          if (isDev) console.log(`[UPLOAD] Slika uspješno upload-ana na Vercel Blob: ${imagePath}`);
        } catch (blobError) {
          console.error(`[UPLOAD] Vercel Blob upload failed:`, blobError);
          console.log(`[UPLOAD] Falling back to /tmp/uploads storage`);
          
          // Fallback na /tmp/uploads ako Vercel Blob ne radi
          const tmpUploadsDir = '/tmp/uploads/profile_images';
          await fs.mkdir(tmpUploadsDir, { recursive: true });
          
          const fileExtension = path.extname(req.file.originalname);
          const fallbackFileName = `member-${memberId}-${Date.now()}${fileExtension}`;
          const fallbackFilePath = path.join(tmpUploadsDir, fallbackFileName);
          
          await fs.writeFile(fallbackFilePath, req.file.buffer);
          imagePath = `/uploads/profile_images/${fallbackFileName}`;
          
          console.log(`[UPLOAD] Profile image saved to fallback storage: ${imagePath}`);
        }
      } else {
        if (isDev) console.log(`[UPLOAD] Korištenje lokalnog uploads foldera...`);
        
        // Kreiraj profile_images direktorij ako ne postoji
        const profileImagesDir = path.join(uploadsDir, 'profile_images');
        await ensureDirectoryExists(profileImagesDir);
        
        // Obriši staru sliku s lokalnog diska
        if (member?.profile_image_path && member.profile_image_path.startsWith('/uploads')) {
          try {
            const oldFilePath = path.join(uploadsDir, member.profile_image_path.replace('/uploads', ''));
            await fs.unlink(oldFilePath);
            if (isDev) console.log(`[UPLOAD] Stara slika obrisana s lokalnog diska: ${oldFilePath}`);
          } catch (delError) {
            if (isDev) console.warn(`[UPLOAD] Upozorenje: Nije moguće obrisati staru sliku s lokalnog diska:`, delError);
          }
        }
        
        // Generiraj ime datoteke
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `processed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
        const filePath = path.join(profileImagesDir, fileName);
        
        // Spremi datoteku na lokalni disk
        await fs.writeFile(filePath, req.file.buffer);
        
        imagePath = `/uploads/profile_images/${fileName}`;
        if (isDev) console.log(`[UPLOAD] Slika uspješno spremljena lokalno: ${filePath}`);
        if (isDev) console.log(`[UPLOAD] Relativna putanja: ${imagePath}`);
      }

      // TRAJNO RJEŠENJE: Validiraj da li datoteka postoji prije spremanja u bazu
      const isValidLocalImage = await validateProfileImageExists(imagePath, uploadsDir);
      
      if (!isValidLocalImage && !imagePath.startsWith('https://')) {
        throw new Error(`Profile image validation failed: ${imagePath} does not exist on disk`);
      }

      const updatedMember = await prisma.member.update({
        where: { member_id: memberIdNum },
        data: {
          profile_image_path: imagePath,
          profile_image_updated_at: new Date(),
        },
      });
      
      // TRAJNO RJEŠENJE: Finalna provjera da li je sve ispravno spremljeno
      if (updatedMember.profile_image_path) {
        const finalValidation = await validateProfileImageExists(updatedMember.profile_image_path, uploadsDir);
        if (!finalValidation && !updatedMember.profile_image_path.startsWith('https://')) {
          console.error(`[UPLOAD] CRITICAL: Profile image path saved but file does not exist: ${updatedMember.profile_image_path}`);
          // Rollback na sigurne default vrijednosti
          await prisma.member.update({
            where: { member_id: memberIdNum },
            data: {
              profile_image_path: null,
              profile_image_updated_at: new Date()
            }
          });
          throw new Error('Profile image upload failed - file could not be validated after save');
        }
      }
      
      if (isDev) console.log(`[UPLOAD] Baza podataka ažurirana i validirana za člana ${memberId}`);

      res.json(updatedMember);
    } catch (error) {
      if (isDev) console.error(`[UPLOAD] Greška pri upload-u slike za člana ${memberId}:`, error);
      const message = error instanceof Error ? error.message : 'Neuspješan upload slike.';
      res.status(500).json({ message });
    }
  }
);

router.delete(
  '/:memberId/profile-image',
  authenticateToken,
  async (req: Request, res: Response) => {
    const { memberId } = req.params;
    const memberIdNum = parseInt(memberId, 10);

    try {
      if (isDev) console.log(`[DELETE] Početak brisanja slike za člana ${memberId}`);
      
      const member = await prisma.member.findUnique({ where: { member_id: memberIdNum } });
      
      // Obriši SVE slike za ovog člana (i iz Blob-a i s lokalnog diska)
      if (useVercelBlob) {
        // Obriši sve slike iz Vercel Blob-a za ovog člana
        try {
          const prefix = `profile-images/${memberIdNum}-`;
          const { blobs } = await list({
            prefix,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          
          if (blobs.length > 0) {
            console.log(`[DELETE] Pronađeno ${blobs.length} slika u Blob-u za brisanje`);
            for (const blob of blobs) {
              await del(blob.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
              console.log(`[DELETE] Obrisana slika iz Blob-a: ${blob.url}`);
            }
          } else {
            if (isDev) console.log(`[DELETE] Nema slika u Blob-u za brisanje`);
          }
        } catch (delError) {
          console.warn(`[DELETE] Upozorenje: Greška pri brisanju slika iz Blob-a:`, delError);
        }
      }
      
      // Obriši lokalnu sliku ako postoji
      if (member?.profile_image_path?.startsWith('/uploads')) {
        if (isDev) console.log(`[DELETE] Brisanje slike s lokalnog diska...`);
        try {
          const filePath = path.join(uploadsDir, member.profile_image_path.replace('/uploads', ''));
          await fs.unlink(filePath);
          if (isDev) console.log(`[DELETE] Slika uspješno obrisana s lokalnog diska: ${filePath}`);
        } catch (delError) {
          if (isDev) console.warn(`[DELETE] Upozorenje: Nije moguće obrisati sliku s lokalnog diska:`, delError);
        }
      }

      const updatedMember = await prisma.member.update({
        where: { member_id: memberIdNum },
        data: {
          profile_image_path: null,
          profile_image_updated_at: new Date(),
        },
      });
      
      if (isDev) console.log(`[DELETE] Baza podataka ažurirana za člana ${memberId}`);

      res.json(updatedMember);
    } catch (error) {
      console.error(`[DELETE] Greška pri brisanju slike za člana ${memberId}:`, error);
      const message = error instanceof Error ? error.message : 'Neuspješno brisanje slike.';
      res.status(500).json({ message });
    }
  }
);

router.get('/test', (req, res) => {
    if (isDev) console.log('Test route hit');
    res.json({ message: 'Member routes are working' });
  });

// Ruta za ručno pokretanje provjere isteklih članstava (za debug/testiranje)
router.post('/check-auto-terminations', roles.requireAdmin, async (req, res) => {
  try {
    // Provjeri je li poslan mock datum
    const { mockDate } = req.body;
    if (mockDate) {
      // Import dateUtils da postavimo mock datum
      const { setMockDate } = await import('../utils/dateUtils.js');
      setMockDate(new Date(mockDate));
    }
    
    // Import membershipService i memberService
    const { default: membershipService } = await import('../services/membership.service.js');
    const { updateAllMembersTotalHours } = await import('../services/member.service.js');
    
    // Provjeri istekla članstva
    await membershipService.checkAutoTerminations();
    
    // Ažuriraj activity_hours i total_hours za sve članove
    await updateAllMembersTotalHours();
    
    res.status(200).json({ 
      success: true, 
      message: 'Provjera isteklih članstava i ažuriranje sati uspješno pokrenuto' 
    });
  } catch (error) {
    console.error('Greška prilikom provjere isteklih članstava:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Greška prilikom provjere isteklih članstava',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/members/recalculate-activity-hours
 * Ponovno izračunava activity_hours za sve članove
 * Koristi se nakon postavljanja mock datuma ili za bulk refresh
 */
router.post('/recalculate-activity-hours', authenticateToken, roles.requireSuperUser, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as Request & { organizationId?: number }).organizationId;
    
    console.log('🔄 Pokrenuto ponovno računanje activity_hours za sve članove...');
    
    // Dohvati sve članove
    const members = await prisma.member.findMany({
      where: organizationId ? { organization_id: organizationId } : {},
      select: { member_id: true }
    });

    let successCount = 0;
    let errorCount = 0;

    // Batch update u grupama od 10 članova
    const batchSize = 10;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (member) => {
          try {
            await updateMemberActivityHours(member.member_id);
            successCount++;
          } catch (error) {
            console.error(`Greška pri ažuriranju člana ${member.member_id}:`, error);
            errorCount++;
          }
        })
      );
      
      console.log(`✅ Obrađeno ${Math.min(i + batchSize, members.length)}/${members.length} članova`);
    }

    console.log(`✅ Završeno: ${successCount} uspješno, ${errorCount} grešaka`);

    res.status(200).json({ 
      success: true, 
      message: `Ponovno izračunavanje activity_hours završeno`,
      processed: members.length,
      successful: successCount,
      errors: errorCount
    });
  } catch (error) {
    console.error('Greška prilikom ponovnog računanja activity_hours:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Greška prilikom ponovnog računanja activity_hours',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Napredni filteri rute
router.get(
  '/functions',
  authenticateToken,
  (req, _res, next) => {
    const orgId = (req as Request & { organizationId?: number }).organizationId;
    console.log(`[ROUTE] /members/functions hit, organizationId: ${orgId ?? 'undefined'}`);
    next();
  },
  memberController.getMembersWithFunctions
);
router.get('/skills/:skillName', authenticateToken, memberController.getMembersBySkill);

router.get('/:memberId/pin-status', authenticateToken, getPinStatus);
router.post('/:memberId/set-pin', authenticateToken, setPin);
router.delete('/:memberId/remove-pin', authenticateToken, removePin);
router.post('/:memberId/reset-pin', authenticateToken, pinResetRateLimit, resetMemberPin); // OSM, GSM ili Superuser može resetirati PIN (with rate limiting)

// Membership routes (previously in separate router, now integrated to avoid route conflicts)
router.post('/:memberId/membership', authenticateToken, roles.requireAdmin, membershipController.updateMembership);
router.post('/:memberId/membership/terminate', authenticateToken, roles.requireAdmin, membershipController.terminateMembership);
router.put('/:memberId/membership-history', authenticateToken, roles.requireAdmin, membershipController.updateMembershipHistory);
router.put('/:memberId/membership-periods/:periodId/end-reason', authenticateToken, roles.requireAdmin, membershipController.updateEndReason);
router.get('/:memberId/history', authenticateToken, membershipController.getMembershipHistory);

export default router;