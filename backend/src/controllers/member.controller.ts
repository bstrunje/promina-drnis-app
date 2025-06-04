// backend/src/controllers/member.controller.ts
import { Request, Response } from "express";
import memberService from "../services/member.service.js";
import memberRepository, {
  MemberCreateData,
  MemberUpdateData,
} from "../repositories/member.repository.js";
import { getCurrentDate, parseDate, formatDate } from '../utils/dateUtils.js';
import { DatabaseUser } from "../middleware/authMiddleware.js";
import bcrypt from "bcrypt";
import authRepository from "../repositories/auth.repository.js";
import auditService from "../services/audit.service.js";
import { uploadConfig } from "../../src/config/upload.js";
import imageService from "../services/image.service.js";
import stampService from "../services/stamp.service.js";
import membershipService from "../services/membership.service.js";
import {
  MembershipPeriod,
  MembershipEndReason,
} from "../shared/types/membership.js";
import multerConfig from "../config/upload.js";
import db from "../utils/db.js";
import prisma from "../utils/prisma.js";
import cardNumberRepository from "../repositories/cardnumber.repository.js";

interface MembershipUpdateRequest {
  paymentDate: string;
  cardNumber?: string;
  stampIssued?: boolean;
  isRenewalPayment?: boolean; // Add this field
}

interface MembershipTerminationRequest {
  reason: "withdrawal" | "non_payment" | "expulsion" | "death";
  endDate?: string;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

function handleControllerError(error: unknown, res: Response): void {
  console.error("Controller error:", error);
  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.status(500).json({ message: "Unknown error" });
  }
}

/**
 * Dohvaća statistike za članski dashboard
 * Vraća broj nepročitanih poruka, nedavnih aktivnosti i ukupan broj članova
 */
export const getMemberDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Dohvati ID trenutno prijavljenog člana iz req.user (postavljen u authMiddleware)
    const memberId = req.user?.id;
    if (!memberId) {
      res.status(401).json({ message: 'Unauthorized access' });
      return;
    }

    // Dohvati broj nepročitanih poruka za člana
    // Koristi try-catch za svaki upit kako bi se izbjeglo potpuno prekidanje funkcije ako neki upit ne uspije
    let unreadMessages = 0;
    try {
      unreadMessages = await prisma.memberMessage.count({
        where: {
          recipient_statuses: {
            some: {
              recipient_member_id: memberId,
              status: 'unread'
            }
          }
        }
      });
    } catch (error) {
      console.error("Error fetching unread messages:", error);
      // Nastavi s izvršavanjem, koristimo default vrijednost 0
    }
    console.log(`Broj nepročitanih poruka za člana ${memberId}: ${unreadMessages}`);

    // Dohvati broj nedavnih aktivnosti
    let recentActivities = 0;
    try {
      const thirtyDaysAgo = new Date(getCurrentDate());
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      recentActivities = await (prisma as any).activity.count({
        where: {
          created_by: memberId,
          created_at: {
            gte: thirtyDaysAgo // Aktivnosti u zadnjih 30 dana
          }
        }
      });
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      // Nastavi s izvršavanjem, koristimo default vrijednost 0
    }
    console.log(`Broj nedavnih aktivnosti za člana ${memberId}: ${recentActivities}`);

    // Dohvati broj članova koji imaju plaćenu članarinu za tekuću godinu
    const currentYear = getCurrentDate().getFullYear();
    
    let memberCount = 0;
    try {
      // Detaljno logiranje za razumijevanje upita
      console.log(`Trenutna godina: ${currentYear}`);
      
      const members = await prisma.member.findMany({
        where: {
          status: 'registered'
        },
        include: {
          membership_details: true
        }
      });
      
      console.log(`Ukupno aktivnih članova: ${members.length}`);
      
      // Filtriraj članove koji imaju plaćenu članarinu
      const membersWithPaidFees = members.filter(member => {
        if (!member.membership_details || !member.membership_details.active_until) {
          console.log(`Član ID ${member.member_id} nema membership_details ili active_until`);
          return false;
        }
        
        // Parsiraj datum
        let paidUntilDate: Date;
        try {
          // Provjeri je li active_until već Date objekt ili string
          if (member.membership_details.active_until instanceof Date) {
            paidUntilDate = member.membership_details.active_until;
          } else {
            paidUntilDate = parseDate(member.membership_details.active_until as string);
          }
          
          const paidYear = paidUntilDate.getFullYear();
          console.log(`Član ID ${member.member_id} ima plaćeno do: ${formatDate(paidUntilDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')}, godina: ${paidYear}`);
          
          // Provjera je li članarina plaćena za tekuću godinu
          const isPaid = paidYear >= currentYear;
          console.log(`Član ID ${member.member_id} ima plaćenu članarinu za tekuću godinu: ${isPaid}`);
          return isPaid;
        } catch (parseError) {
          console.error(`Greška kod parsiranja datuma za člana ${member.member_id}:`, parseError);
          return false;
        }
      });
      
      memberCount = membersWithPaidFees.length;
      console.log(`Broj članova s plaćenom članarinom za tekuću godinu: ${memberCount}`);
      console.log(`Detalji članova s plaćenom članarinom:`, membersWithPaidFees.map(m => ({
        id: m.member_id,
        name: `${m.first_name} ${m.last_name}`,
        paidUntil: m.membership_details?.active_until
      })));
    } catch (error) {
      console.error("Greška kod dohvaćanja članova s plaćenom članarinom:", error);
      // Nastavi s izvršavanjem, koristimo default vrijednost 0
    }

    // Vrati statistike
    res.status(200).json({
      unreadMessages,
      recentActivities,
      memberCount
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};

export const memberController = {
  async getAllMembers(req: Request, res: Response) {
    try {
      const members = await memberRepository.findAll();
      res.json(members);
    } catch (error) {
      // Error handling
    }
  },

  getMemberDashboardStats,

  async getMemberById(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      if (isNaN(memberId)) {
        res.status(400).json({ message: "Invalid member ID" });
        return;
      }

      // Add these headers to prevent caching
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const member = await memberService.getMemberById(memberId);
      if (member === null) {
        res.status(404).json({ message: "Member not found" });
      } else {
        // Add this debugging to see what's happening with the data
        console.log('Member details being sent to client:', {
          membership_details: member.membership_details,
          fee_payment_date: member.membership_details?.fee_payment_date,
          fee_payment_year: member.membership_details?.fee_payment_year
        });

        // Ensure date is properly formatted in ISO string format if it exists
        if (member.membership_details?.fee_payment_date) {
          // Koristimo sigurnije provjere tipova
          const paymentDate = member.membership_details.fee_payment_date;
          
          // Provjeri ima li objekt getTime metodu (što je specifično za Date objekt)
          const isDateObject = typeof paymentDate === 'object' && 
                              paymentDate !== null && 
                              'getTime' in paymentDate;
          
          if (isDateObject) {
            // Ako objekt ima getTime metodu, vjerojatno je Date objekt, pa ga tretiraj kao takav
            // TypeScript je zadovoljan s type assertion u ovom slučaju
            member.membership_details.fee_payment_date = formatDate(paymentDate as Date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
          } else if (typeof paymentDate === 'string') {
            // Ako je string, prvo ga parsiraj pa formatiraj
            member.membership_details.fee_payment_date = formatDate(parseDate(paymentDate), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
          }
        }

        res.json(member);
      }
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async updateMember(
    req: Request<{ memberId: string }, {}, MemberUpdateData>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const updatedMember = await memberService.updateMember(
        memberId,
        req.body
      );
      if (req.user?.id) {
        await auditService.logAction(
          "UPDATE_MEMBER",
          req.user.id,
          `Updated member: ${updatedMember.full_name}`,
          req,
          "success",
          memberId
        );
      }
      res.json(updatedMember);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async updateMemberRole(
    req: Request<
      { memberId: string },
      {},
      { role: "member" | "member_administrator" | "member_superuser" }
    >,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const { role } = req.body;

      if (!["member", "member_administrator", "member_superuser"].includes(role)) {
        res.status(400).json({ message: "Invalid role" });
        return;
      }

      const updatedMember = await memberService.updateMemberRole(
        memberId,
        role
      );

      if (req.user?.id) {
        await auditService.logAction(
          "UPDATE_MEMBER_ROLE",
          req.user.id,
          `Updated member role: ${updatedMember.full_name} to ${role}`,
          req,
          "success",
          memberId
        );
      }
      console.log(
        `[INFO] Successfully updated role for member ${memberId} to ${role}`
      );
      res.json(updatedMember);
    } catch (error) {
      console.error(
        `[ERROR] Failed to update role for member ${req.params.memberId}:`,
        error
      );
      handleControllerError(error, res);
    }
  },

  async updateMembershipEndReason(
    req: Request<
      { memberId: string; periodId: string },
      {},
      { endReason: MembershipEndReason }
    >,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const periodId = parseInt(req.params.periodId, 10);
      const { endReason } = req.body;

      // Validate the end reason
      if (
        !["withdrawal", "non_payment", "expulsion", "death"].includes(endReason)
      ) {
        res.status(400).json({ message: "Invalid termination reason" });
        return;
      }

      await memberService.updatePeriodEndReason(memberId, periodId, endReason);

      if (req.user?.id) {
        await auditService.logAction(
          "UPDATE_MEMBERSHIP_END_REASON",
          req.user.id,
          `Updated membership end reason for member ${memberId}, period ${periodId} to ${endReason}`,
          req,
          "success",
          memberId
        );
      }

      res.json({ message: "Membership end reason updated successfully" });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async getMemberStats(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      if (isNaN(memberId)) {
        res.status(400).json({ message: "Invalid member ID" });
        return;
      }
      const stats = await memberService.getMemberStats(memberId);
      res.json(stats);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async createMember(
    req: Request<{}, {}, MemberCreateData>,
    res: Response
  ): Promise<void> {
    try {
      // Validate required fields
      const requiredFields = [
        "first_name",
        "last_name",
        "gender",
        "email",
        "oib",
      ];
      if (!req.body.first_name) {
        res.status(400).json({ message: "first_name is required" });
        return;
      }
      if (!req.body.last_name) {
        res.status(400).json({ message: "last_name is required" });
        return;
      }
      if (!req.body.gender) {
        res.status(400).json({ message: "gender is required" });
        return;
      }
      if (!req.body.email) {
        res.status(400).json({ message: "email is required" });
        return;
      }
      if (!req.body.oib) {
        res.status(400).json({ message: "oib is required" });
        return;
      }

      // Validate OIB format
      if (!/^\d{11}$/.test(req.body.oib)) {
        res.status(400).json({ message: "OIB must be exactly 11 digits" });
        return;
      }

      const member = await memberService.createMember(req.body);
      if (req.user && req.user.id) {
        await auditService.logAction(
          "CREATE_MEMBER",
          req.user.id,
          `Created member: ${member.first_name} ${member.last_name}`,
          req,
          "success",
          member.member_id
        );
      }
      res.status(201).json(member);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async assignCardNumber(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { memberId } = req.params;
      const { cardNumber } = req.body;

      console.log("Token:", req.headers.authorization);
      console.log("Assigning card number:", { memberId, cardNumber });

      // Dohvati postavke sustava za validaciju duljine broja kartice
      const settings = await prisma.systemSettings.findFirst({
        where: { id: 'default' }
      });
      const cardNumberLength = settings?.cardNumberLength || 5;

      // Dinamička validacija broja iskaznice prema postavkama
      const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
      if (!cardNumberRegex.test(cardNumber)) {
        res.status(400).json({ message: `Card number must be exactly ${cardNumberLength} digits` });
        return;
      }

      // Dohvati podatke o članu
      const member = await memberRepository.findById(parseInt(memberId));
      if (!member) {
        res.status(404).json({ message: "Member not found" });
        return;
      }

      // Provjeri je li broj iskaznice već dodijeljen drugom članu
      const existingCardCheck = await db.query(`
        SELECT m.member_id, m.full_name
        FROM membership_details md
        JOIN members m ON md.member_id = m.member_id
        WHERE md.card_number = $1 AND md.member_id != $2
      `, [cardNumber, memberId]);

      if (existingCardCheck && existingCardCheck.rowCount && existingCardCheck.rowCount > 0) {
        const existingMember = existingCardCheck.rows[0];
        res.status(400).json({ 
          message: `Card number ${cardNumber} is already assigned to member: ${existingMember.full_name}`,
          existingMember: {
            member_id: existingMember.member_id,
            full_name: existingMember.full_name
          }
        });
        return;
      }

      // Provjeri je li član već registriran
      if (member.registration_completed) {
        res.status(400).json({ message: "Can only assign card number for pending members" });
        return;
      }

      // Dohvati postavke sustava za generiranje lozinke (ako još nisu dohvaćene)
      const settingsForPassword = settings || await prisma.systemSettings.findFirst({
        where: { id: 'default' }
      });
      const passwordCardNumberLength = settingsForPassword?.cardNumberLength || 5;

      // Automatski generiraj lozinku prema dogovorenom formatu s dinamičkom duljinom kartice
      const password = `${member.full_name}-isk-${cardNumber.padStart(passwordCardNumberLength, '0')}`;
      console.log(`Generating password: "${password}" for member ${memberId}`);
      const hashedPassword = await bcrypt.hash(password, 10);

      // Pokreni transakciju za ažuriranje člana
      await db.transaction(async (client) => {
        // Ažuriraj podatke o članu - dodaj broj iskaznice
        await membershipService.updateCardDetails(
          parseInt(memberId),
          cardNumber,
          false // Promijenjen s true na false - markica NE treba biti automatski izdana
        );

        // Ažuriraj status i lozinku
        await client.query(`
          UPDATE members
          SET password_hash = $1, 
              status = 'registered', 
              registration_completed = true
          WHERE member_id = $2
        `, [hashedPassword, memberId]);
      });

      if (req.user?.id) {
        await auditService.logAction(
          "ASSIGN_CARD_NUMBER",
          req.user.id,
          `Card number ${cardNumber} assigned to member ${memberId}, activation completed`,
          req,
          "success",
          parseInt(memberId)
        );
      }

      // Automatski sinkroniziraj statuse brojeva iskaznica nakon dodjele
      try {
        console.log("Automatically synchronizing card number statuses after assignment...");
        await cardNumberRepository.syncCardNumberStatus();
        console.log("Automatic synchronization completed successfully");
      } catch (syncError) {
        console.error("Automatic card number synchronization failed:", syncError);
        // Ne prekidamo izvršavanje ako sinkronizacija ne uspije
      }

      res.json({ 
        message: "Card number assigned and member activated successfully",
        card_number: cardNumber,
        status: "registered",
        generatedPassword: password
      });
    } catch (error) {
      console.error("Card assignment error:", error);
      handleControllerError(error, res);
    }
  },

  async issueStamp(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { memberId } = req.params;
      const { forNextYear = false } = req.body; // Dodano za označavanje je li za sljedeću godinu

      const member = await memberService.getMemberById(parseInt(memberId));
      if (!member) {
        res.status(404).json({ message: "Member not found" });
        return;
      }

      const stampType =
        member.life_status === "employed/unemployed"
          ? "employed"
          : member.life_status === "child/pupil/student"
          ? "student"
          : member.life_status === "pensioner"
          ? "pensioner"
          : "employed";

      const result = await stampService.issueStamp(
        parseInt(memberId),
        stampType || null,
        forNextYear // Prosljeđujemo novi parametar
      );

      if (result.success) {
        res.json({ 
          message: forNextYear 
            ? "Stamp for next year issued successfully" 
            : "Stamp issued successfully",
          member: await memberService.getMemberById(parseInt(memberId)) // Vraćamo ažuriranog člana
        });
      }
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async assignPassword(
    req: Request<
      {},
      {},
      { memberId: number; password: string; cardNumber?: string }
    >,
    res: Response
  ): Promise<void> {
    try {
      const { memberId, password, cardNumber } = req.body;
      console.log("Received password assignment request for member:", memberId);
      const hashedPassword = await bcrypt.hash(password, 10);
      await authRepository.updateMemberWithCardAndPassword(
        memberId,
        hashedPassword,
        cardNumber || ""
      ); // Pass cardNumber to the repository

      await db.query("COMMIT");
      res.json({ message: "Password assigned successfully" });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("Password assignment error:", error);
      res.status(500).json({ message: "Failed to assign password" });
    }
  },

  async getMemberWithActivities(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      if (isNaN(memberId)) {
        res.status(400).json({ message: "Invalid member ID" });
        return;
      }
      const memberWithActivities = await memberService.getMemberWithActivities(
        memberId
      );
      if (!memberWithActivities) {
        res.status(404).json({ message: "Member not found" });
        return;
      }
      res.json(memberWithActivities);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async updateMembership(
    req: Request<{ memberId: string }, {}, MembershipUpdateRequest>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);
      if (isNaN(memberId)) {
        res.status(400).json({ message: "Invalid member ID" });
        return;
      }

      const { paymentDate, cardNumber, stampIssued, isRenewalPayment } = req.body;
      console.log("Updating membership for:", {
        memberId,
        paymentDate,
        cardNumber,
        stampIssued,
        isRenewalPayment, // Log this new parameter
      });

      // Procesuiramo plaćanje članarine samo ako je datum plaćanja proslijeđen
      if (paymentDate) {
        // Validate payment date
        const parsedDate = parseDate(paymentDate);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({ message: "Invalid payment date format" });
          return;
        }

        // Set time to noon to avoid timezone issues
        parsedDate.setHours(12, 0, 0, 0);

        console.log("Starting fee payment update");
        console.log("Processing payment date:", formatDate(parsedDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''));
        
        // Pass the isRenewalPayment flag to the updateMembershipFee function
        await memberService.updateMembershipFee(
          memberId,
          parseDate(paymentDate),
          req,
          isRenewalPayment
        );
        
        console.log("Fee payment update completed");
      }

      // Varijabla za praćenje je li broj iskaznice promijenjen (potrebno za automatsku sinkronizaciju)
      let cardNumberChanged = false;

      // Procesuiramo broj iskaznice i status markice samo ako su izričito proslijeđeni
      // Sada su ove operacije odvojene od plaćanja članarine
      if (cardNumber !== undefined) {
        console.log("Starting card number update");
        await memberService.updateMembershipCard(
          memberId,
          cardNumber,
          false // Ne mijenjamo automatski status markice kad ažuriramo broj iskaznice
        );
        console.log("Card number update completed");
        cardNumberChanged = true;
      }
      
      // Odvojeni blok samo za status markice
      if (stampIssued !== undefined) {
        console.log("Updating stamp issued status");
        await memberService.updateMembershipCard(
          memberId,
          "", // Ne dirati broj iskaznice
          stampIssued
        );
        console.log("Stamp status update completed");
      }

      if (req.user?.id) {
        await auditService.logAction(
          "UPDATE_MEMBERSHIP",
          req.user.id,
          `Membership details updated for member ${memberId}`,
          req,
          "success",
          memberId
        );
      }

      // Automatski sinkroniziraj statuse brojeva iskaznica ako je broj iskaznice promijenjen
      if (cardNumberChanged) {
        try {
          console.log("Automatically synchronizing card number statuses after update...");
          await cardNumberRepository.syncCardNumberStatus();
          console.log("Automatic synchronization completed successfully");
        } catch (syncError) {
          console.error("Automatic card number synchronization failed:", syncError);
          // Ne prekidamo izvršavanje ako sinkronizacija ne uspije
        }
      }

      // Fetch the updated member details
      const updatedMember = await memberService.getMemberById(memberId);

      res.json({
        message: "Membership updated successfully",
        member: updatedMember,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async updateMembershipHistory(
    req: Request<{ memberId: string }, {}, { periods: MembershipPeriod[], updateMemberStatus?: boolean }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const { periods, updateMemberStatus } = req.body;

      await membershipService.updateMembershipHistory(memberId, periods, req, updateMemberStatus);

      if (req.user?.id) {
        await auditService.logAction(
          "UPDATE_MEMBERSHIP_HISTORY",
          req.user.id,
          `Updated membership history for member ${memberId}`,
          req,
          "success",
          memberId
        );
      }

      res.json({ message: "Membership history updated successfully" });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async terminateMembership(
    req: Request<{ memberId: string }, {}, MembershipTerminationRequest>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);
      if (isNaN(memberId)) {
        res.status(400).json({ message: "Invalid member ID" });
        return;
      }

      const { reason, endDate } = req.body;

      // Validate the termination reason
      if (
        !["withdrawal", "non_payment", "expulsion", "death"].includes(reason)
      ) {
        res.status(400).json({ message: "Invalid termination reason" });
        return;
      }

      await memberService.terminateMembership(
        memberId,
        reason,
        endDate ? parseDate(endDate) : undefined
      );

      // Log the membership termination in audit log
      if (req.user?.id) {
        await auditService.logAction(
          "TERMINATE_MEMBERSHIP",
          req.user.id,
          `Membership terminated for member ${memberId} with reason: ${reason}`,
          req,
          "success",
          memberId
        );
      }

      res.json({ message: "Membership terminated successfully" });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getMemberDetails(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);
      if (isNaN(memberId)) {
        res.status(400).json({ message: "Invalid member ID" });
        return;
      }

      const memberDetails = await memberService.getMemberWithDetails(memberId);
      if (!memberDetails) {
        res.status(404).json({ message: "Member not found" });
        return;
      }

      res.json(memberDetails);
    } catch (error) {
      console.error("Controller error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async uploadProfileImage(req: RequestWithFile, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);
      if (!req.file) {
        res.status(400).json({ message: "No image file provided" });
        return;
      }

      const imagePath = await imageService.processAndSaveProfileImage(
        req.file,
        memberId
      );

      if (req.user?.id) {
        await auditService.logAction(
          "UPLOAD_PROFILE_IMAGE",
          req.user.id,
          `Profile image uploaded for member ${memberId}`,
          req,
          "success",
          memberId
        );
      }

      res.json({
        message: "Profile image uploaded successfully",
        imagePath,
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Error uploading profile image",
      });
    }
  },

  async deleteProfileImage(req: Request, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);
      await imageService.deleteProfileImage(memberId);

      if (req.user?.id) {
        await auditService.logAction(
          "DELETE_PROFILE_IMAGE",
          req.user.id,
          `Profile image deleted for member ${memberId}`,
          req,
          "success",
          memberId
        );
      }

      res.json({ message: "Profile image deleted successfully" });
    } catch (error) {
      console.error("Error deleting profile image:", error);
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Error deleting profile image",
      });
    }
  },
};

export default memberController;
