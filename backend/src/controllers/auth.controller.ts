import { Request, Response } from "express";
import { DatabaseUser } from "../middleware/authMiddleware.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../utils/db.js";
import { Member, MemberLoginData } from "../shared/types/member.js";
import { PoolClient } from "pg";
import { DatabaseError } from "../utils/db.js";
import authRepository from "../repositories/auth.repository.js";
import auditService from "../services/audit.service.js";
import { JWT_SECRET } from '../config/jwt.config.js';
import prisma from "../utils/prisma.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

interface SetPasswordRequest {
  member_id: number;
  suffix_numbers: string;
}

// Pomoćna funkcija za dohvat duljine broja kartice
async function getCardNumberLength(): Promise<number> {
  const settings = await prisma.systemSettings.findFirst({
    where: { id: 'default' }
  });
  return settings?.cardNumberLength ?? 5; // Koristi 5 kao fallback ako je null ili undefined
}

// Ažurirana funkcija za validaciju lozinke
async function validatePassword(
  password: string,
  suffixNumbers?: string
): Promise<{
  isValid: boolean;
  message?: string;
  formattedPassword?: string;
}> {
  if (password.length < 6) {
    return {
      isValid: false,
      message:
        "Password must be at least 6 characters long before the -isk- suffix",
    };
  }

  if (suffixNumbers) {
    // Dohvati duljinu broja kartice iz postavki
    const cardNumberLength = await getCardNumberLength();
    const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
    
    if (!cardNumberRegex.test(suffixNumbers)) {
      return {
        isValid: false,
        message: `Suffix must be exactly ${cardNumberLength} digits`,
      };
    }
    return {
      isValid: true,
      formattedPassword: `${password}-isk-${suffixNumbers}`, // Add hyphen for consistency
    };
  }

  return { isValid: true };
}

const authController = {
  // 2. Add more detailed logging to the login function to see exact format:
  async login(
    req: Request<{}, {}, MemberLoginData>,
    res: Response
  ): Promise<void> {
    try {
      const { full_name, password } = req.body;
      const userIP = req.ip || req.socket.remoteAddress || 'unknown';

      // Osnovna validacija ulaznih podataka
      if (!full_name || !password) {
        console.warn(`Login attempt without credentials from IP ${userIP}`);
        res.status(400).json({ message: "Username and password are required" });
        return;
      }

      // Sanitizacija ulaznih podataka
      const sanitizedFullName = full_name.trim();
      
      console.log(`Login attempt for user "${sanitizedFullName}" from IP ${userIP}`);

      // 1. Dohvatimo člana prema punom imenu
      const member = await authRepository.findUserByFullName(sanitizedFullName);
      
      // Ako član ne postoji, logiramo pokušaj i vraćamo generičku poruku
      if (!member) {
        console.warn(`Failed login: user "${sanitizedFullName}" not found (IP: ${userIP})`);
        // Koristimo konstantno vrijeme odziva kako bi se spriječili timing napadi
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Ako član nema lozinku, ne može se prijaviti
      if (!member.password_hash) {
        console.warn(`Failed login: user "${sanitizedFullName}" has no password set (IP: ${userIP})`);
        res.status(401).json({ message: "Password not set. Please contact administrator." });
        return;
      }

      // 2. Provjera statusa člana - dohvaćamo iz tablice jer member možda nema property status
      const statusQuery = await db.query('SELECT status, registration_completed FROM members WHERE member_id = $1', [member.member_id]);
      const memberStatus = statusQuery.rows[0];
      
      if (memberStatus.status !== 'registered' || !memberStatus.registration_completed) {
        console.warn(`Failed login: user "${sanitizedFullName}" is not fully registered (IP: ${userIP})`);
        res.status(401).json({ message: "Account setup incomplete. Please contact an administrator." });
        return;
      }

      // 3. Dodatno provjeri je li članarina plaćena
      const membershipQuery = await db.query(`
        SELECT fee_payment_date, fee_payment_year
        FROM membership_details
        WHERE member_id = $1
      `, [member.member_id]);

      // Ako nema detalja o članstvu ili članarina nije plaćena
      if (membershipQuery.rowCount === 0 || !membershipQuery.rows[0].fee_payment_date) {
        console.warn(`Failed login: user "${sanitizedFullName}" has not paid membership fee (IP: ${userIP})`);
        res.status(401).json({ 
          message: "Membership fee not paid. Please contact an administrator to complete your membership."
        });
        return;
      }

      // 4. Usporedimo lozinku s hashom
      const passwordMatch = await bcrypt.compare(password, member.password_hash);
      
      // Ako lozinka ne odgovara, logiramo pokušaj i vraćamo generičku poruku
      if (!passwordMatch) {
        console.warn(`Failed login: incorrect password for user "${sanitizedFullName}" (IP: ${userIP})`);
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // 5. Uspješna prijava - generirajmo JWT token
      const token = jwt.sign(
        { id: member.member_id, role: member.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Ažuriramo podatak o zadnjoj prijavi u bazi
      await db.query(
        "UPDATE members SET last_login = NOW() WHERE member_id = $1",
        [member.member_id]
      );

      // 6. Logiramo uspješnu prijavu
      console.log(`Successful login: user "${sanitizedFullName}" (ID: ${member.member_id}, Role: ${member.role}) from IP ${userIP}`);

      // 7. Bilježimo prijavu u audit log
      await auditService.logAction(
        "LOGIN_SUCCESS",
        member.member_id,
        `User ${sanitizedFullName} logged in`,
        req,
        "success"
      );

      // 8. Vratimo JWT token i osnovne podatke o korisniku
      res.json({
        member: {
          id: member.member_id,
          full_name: member.full_name,
          role: member.role,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  },

  // Other methods remain unchanged...
  async registerInitial(
    req: Request<
      {},
      {},
      Omit<
        Member,
        | "member_id"
        | "status"
        | "role"
        | "total_hours"
        | "password_hash"
        | "last_login"
      >
    >,
    res: Response
  ): Promise<void> {
    try {
      const { first_name, last_name, email } = req.body;

      const memberExists = await db.query<Member>(
        "SELECT * FROM members WHERE email = $1",
        [email],
        { singleRow: true }
      );

      if (memberExists?.rowCount && memberExists.rowCount > 0) {
        res
          .status(400)
          .json({ message: "Member with this email already exists" });
        return;
      }

      await db.transaction(async (client: PoolClient) => {
        const result = await client.query<Member>(
          `INSERT INTO members (
                        first_name, last_name, email, status, role
                    ) VALUES ($1, $2, $3, 'pending', 'member')
                    RETURNING member_id, first_name, last_name, email, role`,
          [first_name, last_name, email]
        );

        const member = result.rows[0];
        res.status(201).json({
          message:
            "Member pre-registered successfully. Awaiting admin password configuration.",
          member_id: member.member_id,
          full_name: `${member.first_name} ${member.last_name}`,
          email: member.email,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof DatabaseError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error registering member" });
      }
    }
  },

  async registerMember(
    req: Request<
      {},
      {},
      Omit<
        Member,
        | "member_id"
        | "password_hash"
        | "total_hours"
        | "last_login"
        | "full_name"
      >
    >,
    res: Response
  ): Promise<void> {
    try {
      const {
        first_name,
        last_name,
        date_of_birth,
        gender,
        street_address,
        city,
        oib,
        cell_phone,
        email,
        life_status,
        tshirt_size,
        shell_jacket_size,
      } = req.body;

      const existingMember = await db.query(
        "SELECT member_id FROM members WHERE oib = $1",
        [oib],
        { singleRow: true }
      );

      if (existingMember?.rowCount && existingMember.rowCount > 0) {
        res.status(400).json({
          message: "Member with this OIB already exists",
        });
        return;
      }

      const result = await db.query<Member>(
        `INSERT INTO members (
                    first_name, last_name, date_of_birth, gender,
                    street_address, city, oib, cell_phone, 
                    email, life_status, tshirt_size, shell_jacket_size,
                    status, role
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'member')
                RETURNING member_id`,
        [
          first_name,
          last_name,
          date_of_birth,
          gender,
          street_address,
          city,
          oib,
          cell_phone,
          email,
          life_status,
          tshirt_size,
          shell_jacket_size,
        ]
      );

      res.status(201).json({
        message: "Registration successful. Please wait for admin approval.",
        member_id: result.rows[0].member_id,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Registration failed",
      });
    }
  },

  async searchMembers(req: Request, res: Response): Promise<void> {
    try {
      const { searchTerm } = req.query;
      const userIP = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Provjera važećeg upita
      if (typeof searchTerm !== "string" || !searchTerm) {
        res.status(400).json({ message: "Valid search term is required" });
        return;
      }
      
      // Dodatna provjera duljine (minimalno 3 znaka)
      if (searchTerm.length < 3) {
        res.status(400).json({ message: "Search term must be at least 3 characters long" });
        return;
      }
      
      // Zapisivanje pretrage u log za potrebe sigurnosne analize
      console.log(`Member search request from IP ${userIP}: "${searchTerm}"`);
      
      // Sprečavanje jednostavnih SQL injection pokušaja
      if (searchTerm.includes("'") || searchTerm.includes(";") || searchTerm.includes("--")) {
        console.warn(`Potential SQL injection attempt from IP ${userIP}: "${searchTerm}"`);
        res.status(400).json({ message: "Invalid search term" });
        return;
      }
      
      const results = await authRepository.searchMembers(searchTerm);
      
      // Dodatno logirajmo broj rezultata za sigurnosnu analizu
      console.log(`Search for "${searchTerm}" returned ${results.length} results`);
      
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Error searching members",
      });
    }
  },

  async assignCardNumber(
    req: Request<{}, {}, { member_id: number, card_number: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { member_id, card_number } = req.body;

      // Dohvati postavke sustava za validaciju duljine broja kartice
      const settings = await prisma.systemSettings.findFirst({
        where: { id: 'default' }
      });
      const cardNumberLength = settings?.cardNumberLength || 5;

      // Dinamička validacija broja iskaznice prema postavkama
      const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
      if (!cardNumberRegex.test(card_number)) {
        res.status(400).json({ message: `Card number must be exactly ${cardNumberLength} digits` });
        return;
      }

      const member = await authRepository.findUserById(member_id);
      if (!member) {
        res.status(404).json({ message: "Member not found" });
        return;
      }

      // Provjeri je li član već registriran
      if (member.registration_completed) {
        res.status(400).json({ message: "Can only assign card number for pending members" });
        return;
      }

      // Generiraj lozinku prema dinamičkom formatu
      const password = `${member.full_name}-isk-${card_number.padStart(cardNumberLength, '0')}`;
      console.log(`Generating password: "${password}" for member ${member_id}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Ažuriraj podatke člana - lozinku, status, broj iskaznice
      await authRepository.updateMemberWithCardAndPassword(
        member_id, 
        hashedPassword, 
        card_number
      );

      res.json({
        message: "Card number assigned and password generated successfully",
        member_id,
        status: "registered",
        card_number
      });
    } catch (error) {
      console.error("Card number assignment error:", error);
      res.status(500).json({ message: "Error assigning card number" });
    }
  },

  async assignPassword(
    req: Request<{}, {}, { memberId: number; password: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { memberId, password } = req.body;
      console.log("Received password assignment request for member:", memberId);
      const hashedPassword = await bcrypt.hash(password, 10);
      await authRepository.updateMemberWithCardAndPassword(memberId, hashedPassword, "");

      res.json({ message: "Password assigned successfully" });
    } catch (error) {
      console.error("Password assignment error:", error);
      res.status(500).json({ message: "Failed to assign password" });
    }
  },

  // Debug method for member information
  async debugMember(req: Request, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.id);
      console.log(`Debug request for member ${memberId}`);
      
      const query = `
        SELECT 
          member_id, 
          first_name, 
          last_name, 
          full_name, 
          email, 
          status,
          registration_completed,
          CASE WHEN password_hash IS NULL THEN false ELSE true END as has_password
        FROM members
        WHERE member_id = $1
      `;
      
      const result = await db.query(query, [memberId]);
      
      if (result.rowCount === 0) {
        console.log(`No member found with ID: ${memberId}`);
        res.status(404).json({ message: 'Member not found' });
        return;
      }
      
      res.json({ 
        member: result.rows[0],
        debug_note: "This endpoint is for development only"
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ message: 'Error retrieving member debug info', error: String(error) });
    }
  }
};

export default authController;