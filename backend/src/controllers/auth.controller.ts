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
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../config/jwt.config.js';
import prisma from "../utils/prisma.js";
import { parseDate, getCurrentDate, formatDate } from '../utils/dateUtils.js';

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

// Funkcija za obnavljanje access tokena pomoću refresh tokena
async function refreshTokenHandler(req: Request, res: Response): Promise<void> {
  console.log('Refresh token zahtjev primljen, cookies:', req.cookies);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Dohvati refresh token iz kolačića ili iz tijela zahtjeva (za razvoj)
  let refreshToken = req.cookies.refreshToken;
  
  // Ako token nije pronađen u kolačićima, provjeri tijelo zahtjeva (za razvoj)
  if (!refreshToken && req.body && req.body.refreshToken) {
    console.log('Refresh token nije pronađen u kolačićima, ali je pronađen u tijelu zahtjeva');
    refreshToken = req.body.refreshToken;
  }
  
  if (!refreshToken) {
    console.log('Refresh token nije pronađen ni u kolačićima ni u tijelu zahtjeva');
    res.status(401).json({ error: 'Refresh token nije pronađen' });
    return;
  }
  
  console.log('Refresh token pronađen, nastavljam s provjerom...');
  
  try {
    // Provjeri valjanost refresh tokena koristeći REFRESH_TOKEN_SECRET
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { id: number, role: string };
    
    // Provjeri postoji li RefreshToken model u Prisma klijentu
    if (!prisma.refresh_tokens) {
      console.error('RefreshToken model nije dostupan u Prisma klijentu!');
      console.log('Dostupni modeli u Prisma klijentu:', Object.keys(prisma));
      res.status(500).json({ error: 'Interna greška servera' });
      return;
    }
    
    console.log(`Tražim refresh token u bazi za korisnika ID: ${decoded.id}`);
    
    // Provjeri postoji li token u bazi
    const storedToken = await prisma.refresh_tokens.findFirst({
      where: { 
        token: refreshToken,
        member_id: decoded.id
      }
    });
    
    console.log('Rezultat pretrage tokena:', storedToken ? `Token pronađen (ID: ${storedToken.id})` : 'Token nije pronađen');
    
    if (!storedToken) {
      console.error(`Refresh token nije pronađen u bazi za korisnika ID: ${decoded.id}`);
      
      // Dodatna dijagnostika - provjeri postoje li uopće tokeni u bazi
      const allTokens = await prisma.refresh_tokens.findMany({
        take: 5 // Ograniči na 5 rezultata
      });
      
      console.log(`Broj tokena u bazi: ${allTokens.length}`);
      if (allTokens.length > 0) {
        console.log('Primjeri tokena u bazi:', allTokens.map(t => ({ id: t.id, member_id: t.member_id })));
      }
      
      res.status(403).json({ error: 'Refresh token nije valjan' });
      return;
    }
    
    // Generiraj novi access token
    const member = await prisma.member.findUnique({ 
      where: { member_id: decoded.id } 
    });
    
    if (!member) {
      res.status(403).json({ error: 'Korisnik nije pronađen' });
      return;
    }
    
    // Generiraj novi access token koristeći JWT_SECRET
    const accessToken = jwt.sign(
      { id: member.member_id, role: member.role }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );
    
    // Implementacija token rotation - generiranje novog refresh tokena koristeći REFRESH_TOKEN_SECRET
    const newRefreshToken = jwt.sign(
      { id: member.member_id, role: member.role }, 
      REFRESH_TOKEN_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Ažuriranje refresh tokena u bazi
    console.log(`Ažuriram refresh token u bazi (ID: ${storedToken.id})`);
    
    try {
      const expiresAt = new Date(getCurrentDate().getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dana
      
      const updatedToken = await prisma.refresh_tokens.update({
        where: { id: storedToken.id },
        data: {
          token: newRefreshToken,
          expires_at: expiresAt // <-- ispravljeno
        }
      });
      
      console.log(`Token uspješno ažuriran, novi datum isteka: ${expiresAt.toISOString()}`);
      
      // Dodatna provjera je li token stvarno ažuriran
      const verifyToken = await prisma.refresh_tokens.findFirst({
        where: { token: newRefreshToken }
      });
      
      if (verifyToken) {
        console.log(`Potvrda: novi token je uspješno ažuriran u bazi s ID: ${verifyToken.id}`);
      } else {
        console.error('Upozorenje: novi token nije pronađen u bazi nakon ažuriranja!');
      }
    } catch (error) {
      console.error('Greška pri ažuriranju refresh tokena:', error);
      throw error; // Propagiraj grešku kako bi se uhvatila u vanjskom try-catch bloku
    }
    
    // Postavi novi refresh token u kolačić s prilagođenim postavkama za cross-origin zahtjeve
    res.cookie('refreshToken', newRefreshToken, { 
      httpOnly: true, 
      // U razvojnom okruženju, ako koristimo različite portove, moramo postaviti secure: false
      // U produkciji uvijek koristimo secure: true
      secure: process.env.NODE_ENV === 'production',
      // U razvojnom okruženju koristimo 'none' za cross-origin zahtjeve između različitih portova
      // U produkciji također koristimo 'none' jer je to potrebno za cross-origin zahtjeve s secure postavkom
      sameSite: 'none' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dana
      path: '/', // Osigurava da je kolačić dostupan na svim putanjama
      // Dodajemo domain postavku za dodatnu fleksibilnost
      domain: process.env.COOKIE_DOMAIN || undefined
    });
    
    console.log('Postavljen novi refresh token kolačić s opcijama:', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });
    
    // Za razvojno okruženje, vraćamo i refresh token u odgovoru kako bi se mogao spremiti u lokalno spremište
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      console.log('Razvojno okruženje: vraćam novi refresh token u odgovoru');
      res.json({ 
        accessToken,
        refreshToken: newRefreshToken
      });
    } else {
      // U produkciji vraćamo samo access token
      res.json({ accessToken });
    }
  } catch (error) {
    console.error('Greška pri obnavljanju tokena:', error);
    res.status(403).json({ error: 'Refresh token nije valjan' });
  }
}

// Funkcija za odjavu korisnika i poništavanje refresh tokena
async function logoutHandler(req: Request, res: Response): Promise<void> {
  // Provjeri postoje li kolačići i refreshToken
  const refreshToken = req.cookies && req.cookies.refreshToken;
  
  console.log('Logout request received, cookies:', req.cookies);
  
  if (refreshToken) {
    try {
      // Ukloni token iz baze
      await (prisma as any).refresh_tokens.deleteMany({
        where: { token: refreshToken }
      });
      console.log('RefreshToken uspješno obrisan iz baze');
    } catch (error) {
      console.error('Greška pri brisanju refresh tokena:', error);
      // Nastavljamo s odjavom čak i ako brisanje ne uspije
    }
  } else {
    console.log('RefreshToken nije pronađen u kolačićima');
  }
  
  // Ukloni kolačić (uvijek pokušaj obrisati, čak i ako ne postoji)
  // Moramo koristiti iste postavke kao i pri postavljanju kolačića
  const cookieOptions = {
    httpOnly: true,
    // U razvojnom okruženju, ako koristimo različite portove, moramo postaviti secure: false
    // U produkciji uvijek koristimo secure: true
    secure: process.env.NODE_ENV === 'production',
    // U razvojnom okruženju koristimo 'none' za cross-origin zahtjeve između različitih portova
    // U produkciji također koristimo 'none' jer je to potrebno za cross-origin zahtjeve s secure postavkom
    sameSite: 'none' as const,
    path: '/', // Osigurava da je kolačić dostupan na svim putanjama
    // Dodajemo domain postavku za dodatnu fleksibilnost
    domain: process.env.COOKIE_DOMAIN || undefined
  };
  
  console.log('Brišem refresh token kolačić s opcijama:', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.status(200).json({ message: 'Uspješna odjava' });
}

const authController = {
  // 2. Add more detailed logging to the login function to see exact format:
  async login(
    req: Request<{}, {}, MemberLoginData>, // Koristi MemberLoginData koji sada ima email
    res: Response
  ): Promise<void> {
    try {
      // Promijenjeno: dohvaća se email umjesto full_name
      const { email, password } = req.body;
      const userIP = req.ip || req.socket.remoteAddress || 'unknown';

      // Osnovna validacija ulaznih podataka (validator ovo već radi, ali dupla provjera ne škodi)
      if (!email || !password) {
        console.warn(`Login attempt without credentials from IP ${userIP}`);
        // Promijenjeno: poruka spominje email
        res.status(400).json({ message: "Email and password are required" });
        return;
      }

      // Sanitizacija ulaznih podataka
      const sanitizedEmail = email.trim(); // Koristi se email
      
      // Promijenjeno: logira se email
      console.log(`Login attempt for user "${sanitizedEmail}" from IP ${userIP}`);

      // 1. Dohvatimo člana prema emailu (pretpostavka da postoji findUserByEmail)
      // Promijenjeno: poziva se findUserByEmail umjesto findUserByFullName
      const member = await authRepository.findUserByEmail(sanitizedEmail);
      
      // Ako član ne postoji, logiramo pokušaj i vraćamo generičku poruku
      if (!member) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: user "${sanitizedEmail}" not found (IP: ${userIP})`);
        // Koristimo konstantno vrijeme odziva kako bi se spriječili timing napadi
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Ako član nema lozinku, ne može se prijaviti
      if (!member.password_hash) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: user "${sanitizedEmail}" has no password set (IP: ${userIP})`);
        res.status(401).json({ message: "Password not set. Please contact administrator." });
        return;
      }

      // 2. Provjera statusa člana - dohvaćamo iz tablice jer member možda nema property status
      const statusQuery = await db.query('SELECT status, registration_completed FROM members WHERE member_id = $1', [member.member_id]);
      const memberStatus = statusQuery.rows[0];
      
      if (memberStatus.status !== 'registered' || !memberStatus.registration_completed) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: user "${sanitizedEmail}" is not fully registered (IP: ${userIP})`);
        res.status(401).json({ message: "Account setup incomplete. Please contact an administrator." });
        return;
      }

      // 3. Dodatno provjeri je li članarina plaćena
      const membershipQuery = await db.query(`
        SELECT fee_payment_date, fee_payment_year
        FROM membership_details
        WHERE member_id = $1
      `, [member.member_id]);

      // Provjeri postoji li zapis o članstvu
      if (membershipQuery.rowCount === 0) {
        console.warn(`Failed login: user "${sanitizedEmail}" has no membership record (IP: ${userIP})`);
        res.status(401).json({ 
          message: "Membership information not found. Please contact an administrator."
        });
        return;
      }
      
      // Dohvati detalje o članstvu
      const membershipDetails = membershipQuery.rows[0];
      const currentYear = getCurrentDate().getFullYear();
      
      // Provjeri jesu li plaćeni detalji za tekuću godinu
      if (membershipDetails.fee_payment_year < currentYear) {
        console.warn(`Failed login: user "${sanitizedEmail}" has expired membership (paid for ${membershipDetails.fee_payment_year}, current year ${currentYear}) (IP: ${userIP})`);
        res.status(401).json({ 
          message: "Your membership has expired. Please contact an administrator to renew your membership."
        });
        return;
      }

      // 4. Usporedimo lozinku s hashom
      const passwordMatch = await bcrypt.compare(password, member.password_hash);
      
      // Ako lozinka ne odgovara, logiramo pokušaj i vraćamo generičku poruku
      if (!passwordMatch) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: incorrect password for user "${sanitizedEmail}" (IP: ${userIP})`);
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // 5. Uspješna prijava - generirajmo JWT token (access token)
      const token = jwt.sign(
        { id: member.member_id, role: member.role },
        JWT_SECRET,
        { expiresIn: "15m" } // Smanjeno na 15 minuta za bolju sigurnost
      );

      // Generiraj refresh token
      const refreshToken = jwt.sign(
        { id: member.member_id, role: member.role },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" } // Refresh token traje 7 dana
      );

      // Spremi refresh token u bazu
      try {
        console.log(`Pokušavam spremiti refresh token za korisnika ID: ${member.member_id}`);
        
        // Provjeri postoji li RefreshToken model u Prisma klijentu
        if (!prisma.refresh_tokens) {
          console.error('RefreshToken model nije dostupan u Prisma klijentu!');
          console.log('Dostupni modeli u Prisma klijentu:', Object.keys(prisma));
          throw new Error('RefreshToken model nije dostupan');
        }
        
        // Prvo provjeri postoji li već refresh token za ovog korisnika
        console.log('Tražim postojeći refresh token u bazi...');
        const existingToken = await prisma.refresh_tokens.findFirst({
          where: { member_id: member.member_id }
        });

        const expiresAt = new Date(getCurrentDate().getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dana
        
        if (existingToken) {
          console.log(`Pronađen postojeći token (ID: ${existingToken.id}), ažuriram ga...`);
          // Ažuriraj postojeći token
          const updatedToken = await prisma.refresh_tokens.update({
            where: { id: existingToken.id },
            data: {
              token: refreshToken,
              expires_at: expiresAt // <-- ispravljeno
            }
          });
          console.log(`Token uspješno ažuriran, novi datum isteka: ${expiresAt.toISOString()}`);
        } else {
          console.log('Nije pronađen postojeći token, kreiram novi...');
          // Kreiraj novi token
          const newToken = await prisma.refresh_tokens.create({
            data: {
              token: refreshToken,
              member_id: member.member_id,
              expires_at: expiresAt // <-- ispravljeno
            }
          });
          console.log(`Novi token uspješno kreiran s ID: ${newToken.id}, datum isteka: ${expiresAt.toISOString()}`);
        }
        
        // Dodatna provjera je li token stvarno spremljen
        const verifyToken = await prisma.refresh_tokens.findFirst({
          where: { token: refreshToken }
        });
        
        if (verifyToken) {
          console.log(`Potvrda: token je uspješno spremljen u bazu s ID: ${verifyToken.id}`);
        } else {
          console.error('Upozorenje: token nije pronađen u bazi nakon spremanja!');
        }

        // Postavi refresh token kao HTTP-only kolačić s prilagođenim postavkama za cross-origin zahtjeve
        const cookieOptions = { 
          httpOnly: true, 
          // U razvojnom okruženju, ako koristimo različite portove, moramo postaviti secure: false
          // U produkciji uvijek koristimo secure: true
          secure: process.env.NODE_ENV === 'production',
          // U razvojnom okruženju koristimo 'none' za cross-origin zahtjeve između različitih portova
          // U produkciji također koristimo 'none' jer je to potrebno za cross-origin zahtjeve s secure postavkom
          sameSite: 'none' as const,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dana
          path: '/', // Osigurava da je kolačić dostupan na svim putanjama
          // Dodajemo domain postavku za dodatnu fleksibilnost
          domain: process.env.COOKIE_DOMAIN || undefined
        };
        
        console.log('Postavljam refresh token kolačić s opcijama:', cookieOptions);
        res.cookie('refreshToken', refreshToken, cookieOptions);

        // Provjeri je li kolačić postavljen u odgovoru
        console.log('Response headers:', res.getHeaders());
        console.log(`Refresh token uspješno generiran i pohranjen za korisnika ID: ${member.member_id}`);
      } catch (error) {
        console.error('Greška pri spremanju refresh tokena:', error);
        // Nastavljamo s prijavom čak i ako spremanje refresh tokena ne uspije
      }

      // Ažuriramo podatak o zadnjoj prijavi u bazi
      await db.query(
        "UPDATE members SET last_login = NOW() WHERE member_id = $1",
        [member.member_id]
      );

      // 6. Logiramo uspješnu prijavu
      // Promijenjeno: logira se email
      console.log(`Successful login: user "${sanitizedEmail}" (ID: ${member.member_id}, Role: ${member.role}) from IP ${userIP}`);

      // 7. Bilježimo prijavu u audit log
      await auditService.logAction(
        "LOGIN_SUCCESS",
        member.member_id,
        // Promijenjeno: logira se email
        `User ${sanitizedEmail} logged in`,
        req,
        "success"
      );

      // 8. Vratimo JWT token i osnovne podatke o korisniku
      // Vraćamo full_name koji postoji na member objektu dohvaćenom iz baze
      
      // Za razvojno okruženje, vraćamo i refresh token kako bi se mogao spremiti u lokalno spremište
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      const responseData = {
        member: {
          id: member.member_id,
          full_name: `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`,
          role: member.role,
        },
        token,
      };
      
      // Ako smo u razvojnom okruženju, dodaj refresh token u odgovor
      if (isDevelopment) {
        console.log('Razvojno okruženje: vraćam refresh token u odgovoru');
        // Dodajemo refresh token u odgovor samo za razvojno okruženje
        Object.assign(responseData, { refreshToken });
      }
      
      res.json(responseData);
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
          full_name: `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`,
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

      // Provjeri postoji li član s istim OIB-om koristeći Prisma ORM
      const existingMember = await prisma.member.findUnique({ where: { oib } });
      if (existingMember) {
        res.status(400).json({
          message: "Member with this OIB already exists",
        });
        return;
      }

      // Kreiraj novog člana koristeći Prisma ORM
      const member = await prisma.member.create({
        data: {
          first_name,
          last_name,
          full_name: `${first_name} ${last_name}`, // Puno ime je obavezno polje
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
          status: 'pending', // Novi član je uvijek na čekanju
          role: 'member',
        },
        select: { member_id: true }, // Vraćamo samo member_id
      });

      res.status(201).json({
        message: "Registration successful. Please wait for admin approval.",
        member_id: member.member_id,
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
  async debugMember(req: Request, res: Response): Promise<void | Response> {
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
      
      const member = result.rows[0];
      return res.json({ 
        member: result.rows[0],
        debug_note: "This endpoint is for development only"
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      return res.status(500).json({ error: String(error) });
    }
  },

  // Funkcija za obnavljanje access tokena
  async refreshToken(req: Request, res: Response): Promise<void | Response> {
    await refreshTokenHandler(req, res);
  },

  // Funkcija za odjavu korisnika
  async logout(req: Request, res: Response): Promise<void | Response> {
    await logoutHandler(req, res);
  }

};

export default authController;