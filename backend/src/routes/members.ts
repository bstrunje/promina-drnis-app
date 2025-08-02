// backend/src/routes/members.ts
import express, { Request, Response } from 'express';
import type { RequestHandler } from 'express';
import { put, del } from '@vercel/blob';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { memberController, getMemberDashboardStats } from '../controllers/member.controller.js';
import memberProfileController from '../controllers/memberProfile.controller.js';
import cardNumberController from '../controllers/cardnumber.controller.js';
import memberStatsController from '../controllers/memberStats.controller.js';
import memberMessageController from '../controllers/member.message.controller.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';
import { MembershipEndReason } from '../shared/types/membership.js';
import memberService from '../services/member.service.js';
import stampService from '../services/stamp.service.js';

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

console.log(`[UPLOAD] Konfiguracija:`);
console.log(`[UPLOAD] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[UPLOAD] BLOB_READ_WRITE_TOKEN: ${hasVercelBlobToken ? 'postoji' : 'ne postoji'}`);
console.log(`[UPLOAD] useVercelBlob: ${useVercelBlob}`);
console.log(`[UPLOAD] uploadsDir: ${uploadsDir}`);

// Funkcija za kreiranje direktorija ako ne postoji
const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`[UPLOAD] Kreiran direktorij: ${dirPath}`);
  }
};

// Public routes
// Dashboard statistike za običnog člana - stavljeno prije dinamičkih ruta da se ne poklopi s /:memberId
router.get('/dashboard/stats', authenticateToken, getMemberDashboardStats);

// Rute za poruke koje moraju biti prije dinamičke /:memberId rute
router.get('/unread-count', authenticateToken, memberMessageController.getUnreadMessageCount);
router.get('/sent', authenticateToken, memberMessageController.getSentMessages);

router.get('/', authenticateToken, memberController.getAllMembers);
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



// For returning stamps to inventory - only superuser can do this
router.post("/:memberId/stamp/return", authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { forNextYear = false } = req.body; // Get parameter from request body
    
    // Get member details to determine stamp type
    const member = await memberService.getMemberById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    // Map life status to stamp type
    const stampType = 
      member.life_status === "employed/unemployed" ? "employed" :
      member.life_status === "child/pupil/student" ? "student" :
      member.life_status === "pensioner" ? "pensioner" : "employed";
    
    // Return stamp to inventory with the new parameter
    await stampService.returnStamp(stampType, memberId, forNextYear);
    
    // Update only for current year stamps (prisma limitation)
    if (!forNextYear) {
      // Ažuriraj samo u membership_details tablici jer card_stamp_issued više nije polje na Memberu
      await prisma.membershipDetails.update({
        where: { member_id: memberId },
        data: { card_stamp_issued: false }
      });
    } else {
      // Za markice za sljedeću godinu, ažuriraj membership_details tablicu
      await prisma.membershipDetails.update({
        where: { member_id: memberId },
        data: { next_year_stamp_issued: false }
      });
      console.log(`Returning next year stamp for member ${memberId} - Updated in database`);
    }
    
    // Get updated member to return in response
    const updatedMember = await memberService.getMemberById(memberId);
    
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

// Rute za profilnu sliku (Uvjetno: Vercel Blob ili lokalni uploads)
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
      console.log(`[UPLOAD] Početak upload-a slike za člana ${memberId}`);
      console.log(`[UPLOAD] Datoteka: ${req.file.originalname}, veličina: ${req.file.size} bytes`);
      
      // Prvo obriši staru sliku ako postoji
      const member = await prisma.member.findUnique({ where: { member_id: memberIdNum } });
      
      let imagePath: string;
      
      if (useVercelBlob) {
        console.log(`[UPLOAD] Korištenje Vercel Blob za upload...`);
        
        // Obriši staru sliku s Vercel Blob-a
        if (member?.profile_image_path && member.profile_image_path.includes('vercel-storage.com')) {
          try {
            await del(member.profile_image_path);
            console.log(`[UPLOAD] Stara slika obrisana s Vercel Blob-a`);
          } catch (delError) {
            console.warn(`[UPLOAD] Upozorenje: Nije moguće obrisati staru sliku s Vercel Blob-a:`, delError);
          }
        }
        
        const fileName = `profile-images/${memberId}-${Date.now()}-${req.file.originalname}`;
        const blob = await put(fileName, req.file.buffer, {
          access: 'public',
          contentType: req.file.mimetype,
        });
        
        imagePath = blob.url;
        console.log(`[UPLOAD] Slika uspješno upload-ana na Vercel Blob: ${imagePath}`);
      } else {
        console.log(`[UPLOAD] Korištenje lokalnog uploads foldera...`);
        
        // Kreiraj profile_images direktorij ako ne postoji
        const profileImagesDir = path.join(uploadsDir, 'profile_images');
        await ensureDirectoryExists(profileImagesDir);
        
        // Obriši staru sliku s lokalnog diska
        if (member?.profile_image_path && member.profile_image_path.startsWith('/uploads')) {
          try {
            const oldFilePath = path.join(uploadsDir, member.profile_image_path.replace('/uploads', ''));
            await fs.unlink(oldFilePath);
            console.log(`[UPLOAD] Stara slika obrisana s lokalnog diska: ${oldFilePath}`);
          } catch (delError) {
            console.warn(`[UPLOAD] Upozorenje: Nije moguće obrisati staru sliku s lokalnog diska:`, delError);
          }
        }
        
        // Generiraj ime datoteke
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `processed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
        const filePath = path.join(profileImagesDir, fileName);
        
        // Spremi datoteku na lokalni disk
        await fs.writeFile(filePath, req.file.buffer);
        
        imagePath = `/uploads/profile_images/${fileName}`;
        console.log(`[UPLOAD] Slika uspješno spremljena lokalno: ${filePath}`);
        console.log(`[UPLOAD] Relativna putanja: ${imagePath}`);
      }

      const updatedMember = await prisma.member.update({
        where: { member_id: memberIdNum },
        data: {
          profile_image_path: imagePath,
          profile_image_updated_at: new Date(),
        },
      });
      
      console.log(`[UPLOAD] Baza podataka ažurirana za člana ${memberId}`);

      res.json(updatedMember);
    } catch (error) {
      console.error(`[UPLOAD] Greška pri upload-u slike za člana ${memberId}:`, error);
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
      console.log(`[DELETE] Početak brisanja slike za člana ${memberId}`);
      
      const member = await prisma.member.findUnique({ where: { member_id: memberIdNum } });
      
      if (member?.profile_image_path) {
        if (useVercelBlob && member.profile_image_path.includes('vercel-storage.com')) {
          console.log(`[DELETE] Brisanje slike s Vercel Blob-a...`);
          try {
            await del(member.profile_image_path);
            console.log(`[DELETE] Slika uspješno obrisana s Vercel Blob-a`);
          } catch (delError) {
            console.warn(`[DELETE] Upozorenje: Nije moguće obrisati sliku s Vercel Blob-a:`, delError);
          }
        } else if (member.profile_image_path.startsWith('/uploads')) {
          console.log(`[DELETE] Brisanje slike s lokalnog diska...`);
          try {
            const filePath = path.join(uploadsDir, member.profile_image_path.replace('/uploads', ''));
            await fs.unlink(filePath);
            console.log(`[DELETE] Slika uspješno obrisana s lokalnog diska: ${filePath}`);
          } catch (delError) {
            console.warn(`[DELETE] Upozorenje: Nije moguće obrisati sliku s lokalnog diska:`, delError);
          }
        }
      } else {
        console.log(`[DELETE] Član ${memberId} nema profilnu sliku za brisanje`);
      }

      const updatedMember = await prisma.member.update({
        where: { member_id: memberIdNum },
        data: {
          profile_image_path: null,
          profile_image_updated_at: new Date(),
        },
      });
      
      console.log(`[DELETE] Baza podataka ažurirana za člana ${memberId}`);

      res.json(updatedMember);
    } catch (error) {
      console.error(`[DELETE] Greška pri brisanju slike za člana ${memberId}:`, error);
      const message = error instanceof Error ? error.message : 'Neuspješno brisanje slike.';
      res.status(500).json({ message });
    }
  }
);

router.get('/test', (req, res) => {
    console.log('Test route hit');
    res.json({ message: 'Member routes are working' });
  });
  
export default router;