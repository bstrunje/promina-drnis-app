import db from '../utils/db.js';
import prisma from '../utils/prisma.js';
import { Member, MemberSearchResult } from '../shared/types/member.js';

const authRepository = {
    // OPTIMIZACIJA: Prisma upit umjesto db.query za serverless performanse
    async findUserByFullName(full_name: string): Promise<Member | null> {
        console.log(`[AUTH-REPO] Tražim korisnika po imenu: ${full_name}`);
        try {
            const member = await prisma.member.findFirst({
                where: { full_name }
            });
            return member as unknown as Member | null;
        } catch (error) {
            console.error('[AUTH-REPO] Greška pri traženju korisnika po imenu:', error);
            return null;
        }
    },

    // OPTIMIZACIJA: Prisma upit za traženje po email-u
    async findUserByEmail(email: string): Promise<Member | null> {
        console.log(`[AUTH-REPO] Tražim korisnika po email-u: ${email}`);
        try {
            const member = await prisma.member.findFirst({
                where: { email }
            });
            return member as unknown as Member | null;
        } catch (error) {
            console.error('[AUTH-REPO] Greška pri traženju korisnika po email-u:', error);
            return null;
        }
    },

    // KRITIČNA OPTIMIZACIJA: Najvažnija funkcija za authMiddleware
    async findUserById(id: number): Promise<Member | null> {
        console.log(`[AUTH-REPO] Tražim korisnika po ID: ${id}`);
        const startTime = Date.now();
        try {
            const member = await prisma.member.findUnique({
                where: { member_id: id }
            });
            const duration = Date.now() - startTime;
            console.log(`[AUTH-REPO] Korisnik ${id} pronađen u ${duration}ms`);
            return member as unknown as Member | null;
        } catch (error) {
            console.error(`[AUTH-REPO] Greška pri traženju korisnika ${id}:`, error);
            return null;
        }
    },

    // OPTIMIZACIJA: Prisma create umjesto db.query
    async createMember(memberData: Omit<Member, 'member_id'>): Promise<Member> {
        console.log(`[AUTH-REPO] Stvaram novog člana: ${memberData.email}`);
        try {
            const member = await prisma.member.create({
                data: {
                    first_name: memberData.first_name,
                    last_name: memberData.last_name,
                    full_name: `${memberData.first_name} ${memberData.last_name}`, // Dodaj full_name
                    email: memberData.email,
                    cell_phone: memberData.cell_phone,
                    street_address: memberData.street_address,
                    city: memberData.city,
                    oib: memberData.oib,
                    date_of_birth: memberData.date_of_birth,
                    gender: memberData.gender,
                    life_status: memberData.life_status,
                    tshirt_size: memberData.tshirt_size,
                    shell_jacket_size: memberData.shell_jacket_size,
                    status: 'pending',
                    role: 'member',
                    membership_type: 'regular'
                }
            });
            console.log(`[AUTH-REPO] Član ${memberData.email} uspješno stvoren`);
            return member as unknown as Member; // Sigurna konverzija
        } catch (error) {
            console.error(`[AUTH-REPO] Greška pri stvaranju člana ${memberData.email}:`, error);
            throw error;
        }
    },

    // OPTIMIZACIJA: Prisma $transaction umjesto db.transaction
    async updateMemberWithCardAndPassword(
        memberId: number, 
        passwordHash: string, 
        cardNumber: string
    ): Promise<void> {
        try {
            console.log('[AUTH] ==== MEMBER UPDATE DETAILS ====');
            console.log(`[AUTH] Member ID: ${memberId}`);
            console.log(`[AUTH] Password hash length: ${passwordHash.length}`);
            console.log(`[AUTH] Card number assigned: "${cardNumber}"`);
            
            await prisma.$transaction(async (tx) => {
                // Prvo ažuriramo status člana i lozinku - Prisma update
                const updatedMember = await tx.member.update({
                    where: { member_id: memberId },
                    data: {
                        password_hash: passwordHash,
                        status: 'registered',
                        registration_completed: true
                    },
                    select: {
                        member_id: true,
                        full_name: true,
                        status: true,
                        registration_completed: true
                    }
                });
                
                console.log('[AUTH] Member after update:', updatedMember);
                
                // Zatim ažuriramo broj članske iskaznice - Prisma upsert
                try {
                    await tx.membershipDetails.upsert({
                        where: { member_id: memberId },
                        update: { card_number: cardNumber },
                        create: {
                            member_id: memberId,
                            card_number: cardNumber
                        }
                    });
                    
                    console.log('[AUTH] Card number updated successfully');
                } catch (cardError) {
                    console.error('[AUTH] Failed to update card number:', cardError);
                    throw cardError; // Propagiramo grešku da bismo poništili cijelu transakciju
                }
            });
            console.log('[AUTH] Member update completed successfully');
        } catch (error) {
            console.error("[AUTH] Error updating member with card and password:", error);
            throw error;
        }
    },

    async searchMembers(searchTerm: string): Promise<MemberSearchResult[]> {
        // Osigurajmo da pretraživanje zahtijeva minimalno 3 znaka
        if (searchTerm.length < 2) {
            return [];
        }
        
        const result = await db.query<MemberSearchResult>(`
            SELECT 
                member_id,
                -- Vraća puno ime i nadimak ako postoji
                first_name || ' ' || last_name || 
                  CASE WHEN nickname IS NOT NULL AND nickname != '' 
                       THEN ' - ' || nickname 
                       ELSE '' END as full_name,
                nickname
            FROM members 
            WHERE 
                LOWER(full_name) LIKE LOWER($1)
                AND registration_completed = true
                AND (role = 'member_superuser' OR status = 'registered')
            ORDER BY first_name, last_name 
            -- Ograničavamo na maksimalno 5 rezultata da se spriječi preglašavanje svih članova
            LIMIT 5`,
            [`%${searchTerm}%`]
        );
        return result.rows;
    },

    async checkExistingOib(oib: string): Promise<boolean> {
        const result = await db.query(
            'SELECT COUNT(*) as count FROM members WHERE oib = $1',
            [oib]
        );
        return parseInt(result.rows[0].count) > 0;
    },

    async verifyEmail(email: string): Promise<void> {
        await db.query(
            'UPDATE members SET email_verified = true WHERE email = $1',
            [email]
        );
    },

    async setResetToken(email: string, token: string, expiry: Date): Promise<void> {
        await db.query(
            'UPDATE members SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
            [token, expiry, email]
        );
    },

    async findByResetToken(token: string): Promise<Member | null> {
        const result = await db.query<Member>(
            'SELECT * FROM members WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );
        return result.rows[0] || null;
    },

    async clearResetToken(id: number): Promise<void> {
        await db.query(
            'UPDATE members SET reset_token = NULL, reset_token_expires = NULL WHERE member_id = $1',
            [id]
        );
    }
};

export default authRepository;