import prisma from '../utils/prisma.js';
import { Member, MemberSearchResult } from '../shared/types/member.js';

const authRepository = {
    async findUserByFullName(full_name: string, organizationId?: number): Promise<Member | null> {
        console.log(`[AUTH-REPO] Tražim korisnika po imenu: ${full_name}${organizationId ? ` u organizaciji ${organizationId}` : ''}`);
        try {
            // Razdvoji full_name na first_name i last_name (ignoriraj nadimak ako postoji)
            // Format može biti: "Ime Prezime" ili "Ime Prezime - Nadimak"
            const nameParts = full_name.split(' - ')[0].trim().split(' ');
            
            if (nameParts.length < 2) {
                console.log('[AUTH-REPO] Neispravan format imena');
                return null;
            }
            
            // Zadnje riječ je prezime, sve ostalo je ime
            const last_name = nameParts[nameParts.length - 1];
            const first_name = nameParts.slice(0, -1).join(' ');
            
            console.log(`[AUTH-REPO] Tražim: first_name="${first_name}", last_name="${last_name}"`);
            
            const member = await prisma.member.findFirst({
                where: { 
                    first_name,
                    last_name,
                    ...(organizationId && { organization_id: organizationId })
                }
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

    async searchMembers(organizationId: number, searchTerm: string): Promise<MemberSearchResult[]> {
        // Osigurajmo da pretraživanje zahtijeva minimalno 1 znak
        if (searchTerm.length < 1) {
            return [];
        }
        
        // Prebačeno na Prisma ORM za Vercel serverless kompatibilnost
        const members = await prisma.member.findMany({
            where: {
                organization_id: organizationId,
                full_name: {
                    contains: searchTerm,
                    mode: 'insensitive' // Case-insensitive pretraga (kao LOWER())
                },
                registration_completed: true,
                OR: [
                    { role: 'member_superuser' },
                    { status: 'registered' }
                ]
            },
            select: {
                member_id: true,
                full_name: true,
                nickname: true
                // oib: NE vraćamo - osjetljiv podatak, nije potreban za slanje poruka
            },
            orderBy: [
                { first_name: 'asc' },
                { last_name: 'asc' }
            ],
            take: 5 // Limit 5 rezultata
        });

        // Transformiramo u MemberSearchResult format (bez OIB-a - osjetljiv podatak)
        return members.map(member => ({
            member_id: member.member_id,
            full_name: member.full_name ?? '',
            nickname: member.nickname ?? undefined
        })) as MemberSearchResult[];
    },

    async existsByOib(oib: string): Promise<boolean> {
        const count = await prisma.member.count({
            where: { oib }
        });
        return count > 0;
    }

    // NAPOMENA: Funkcije za email verification i password reset token su uklonjene
    // jer koriste polja (email_verified, reset_token, reset_token_expires) koja ne postoje u Prisma shemi.
    // Ako su potrebne, prvo dodaj polja u schema.prisma i pokreni migraciju.
};

export default authRepository;