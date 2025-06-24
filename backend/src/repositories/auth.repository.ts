import db from '../utils/db.js';
import { Member, MemberSearchResult } from '../shared/types/member.js';

const authRepository = {
    async findUserByFullName(full_name: string): Promise<Member | null> {
        const result = await db.query<Member>(
            'SELECT * FROM members WHERE full_name = $1',
            [full_name]
        );
        return result.rows[0] || null;
    },

    async findUserByEmail(email: string): Promise<Member | null> {
        const result = await db.query<Member>(
            'SELECT * FROM members WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    },

    async findUserById(id: number): Promise<Member | null> {
        const result = await db.query<Member>(
            'SELECT * FROM members WHERE member_id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    async createMember(memberData: Omit<Member, 'member_id'>): Promise<Member> {
        const result = await db.query<Member>(
            `INSERT INTO members (
                first_name, last_name, email, cell_phone, 
                street_address, city, oib, date_of_birth, 
                gender, life_status, tshirt_size, shell_jacket_size,
                status, role, membership_type
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                'pending', 'member', 'regular'
            ) RETURNING *`,
            [
                memberData.first_name,
                memberData.last_name,
                memberData.email,
                memberData.cell_phone,
                memberData.street_address,
                memberData.city,
                memberData.oib,
                memberData.date_of_birth,
                memberData.gender,
                memberData.life_status,
                memberData.tshirt_size,
                memberData.shell_jacket_size
            ]
        );
        return result.rows[0];
    },

    async updateMemberWithCardAndPassword(
        memberId: number, 
        passwordHash: string, 
        cardNumber: string
    ): Promise<void> {
        try {
            console.log('==== MEMBER UPDATE DETAILS ====');
            console.log(`Member ID: ${memberId}`);
            console.log(`Password hash length: ${passwordHash.length}`);
            console.log(`Card number assigned: "${cardNumber}"`);
            
            await db.transaction(async (client) => {
                // Prvo ažuriramo status člana i lozinku
                await client.query(`
                    UPDATE members
                    SET password_hash = $1, 
                        status = 'registered', 
                        registration_completed = true
                    WHERE member_id = $2
                `, [passwordHash, memberId]);
                
                // Dohvatimo ažurirane podatke o članu za potvrdu
                const memberAfterUpdate = await client.query(
                    'SELECT member_id, full_name, status, registration_completed FROM members WHERE member_id = $1',
                    [memberId]
                );
                
                console.log('Member after update:', memberAfterUpdate.rows[0]);
                
                // Zatim ažuriramo broj članske iskaznice
                try {
                    await client.query(`
                        INSERT INTO membership_details (member_id, card_number)
                        VALUES ($1, $2)
                        ON CONFLICT (member_id) 
                        DO UPDATE SET card_number = $2
                    `, [memberId, cardNumber]);
                    
                    console.log('Card number updated successfully');
                } catch (cardError) {
                    console.error('Failed to update card number:', cardError);
                    throw cardError; // Propagiramo grešku da bismo poništili cijelu transakciju
                }
            });
            console.log('Member update completed successfully');
        } catch (error) {
            console.error("Error updating member with card and password:", error);
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