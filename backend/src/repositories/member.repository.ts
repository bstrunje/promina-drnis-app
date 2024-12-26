// backend/src/repositories/member.repository.ts
import db from '../utils/db.js';
import { PoolClient } from 'pg';
import { Member, MemberRole, Gender } from '../../../shared/types/member.js';

// Interfaces for data operations
export interface MemberCreateData extends Omit<Member, 'member_id' | 'status' | 'role' | 'total_hours' | 'last_login' | 'password_hash' | 'full_name'> {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: Gender;
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status: Member['life_status'];
    tshirt_size: Member['tshirt_size'];
    shell_jacket_size: Member['shell_jacket_size'];
    membership_type: Member['membership_type'];
}

export interface MemberUpdateData extends Partial<Omit<Member, 'member_id' | 'status' | 'role'>> {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: Gender;
    street_address?: string;
    city?: string;
    oib?: string;
    cell_phone?: string;
    email?: string;
    life_status?: Member['life_status'];
    tshirt_size?: Member['tshirt_size'];
    shell_jacket_size?: Member['shell_jacket_size'];
    total_hours?: number;
    membership_type?: Member['membership_type'];
}

export interface MemberStats {
    total_activities: number;
    total_hours: number;
    membership_type: Member['membership_type'];
    activity_status: 'active' | 'passive';
}

const memberRepository = {
    async findAll(): Promise<Member[]> {
        const result = await db.query<Member>(`
            SELECT m.*, COALESCE(stats.total_hours, 0) as total_hours
            FROM members m
            LEFT JOIN (
                SELECT member_id, SUM(hours_spent) as total_hours
                FROM activity_participants
                WHERE verified_at IS NOT NULL
                GROUP BY member_id
            ) stats ON m.member_id = stats.member_id
            ORDER BY m.last_name, m.first_name
        `);
        return result.rows;
    },

    async findById(id: number): Promise<Member | null> {
    const result = await db.query<Member>(
        `SELECT 
            m.*,
            md.card_number,
            md.fee_payment_year,
            md.card_stamp_issued,
            md.fee_payment_date,
            (SELECT json_agg(
                json_build_object(
                    'period_id', mp.period_id,
                    'start_date', mp.start_date,
                    'end_date', mp.end_date,
                    'end_reason', mp.end_reason
                )
            )
            FROM membership_periods mp
            WHERE mp.member_id = m.member_id) as membership_history
        FROM members m
        LEFT JOIN membership_details md ON m.member_id = md.member_id
        WHERE m.member_id = $1`,
        [id]
    );
    return result.rows[0] || null;
},

    async update(memberId: number, memberData: MemberUpdateData): Promise<Member> {
        const result = await db.query<Member>(`
            UPDATE members
            SET 
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                date_of_birth = COALESCE($3, date_of_birth),
                gender = COALESCE($4, gender),
                street_address = COALESCE($5, street_address),
                city = COALESCE($6, city),
                oib = COALESCE($7, oib),
                cell_phone = COALESCE($8, cell_phone),
                email = COALESCE($9, email),
                life_status = COALESCE($10, life_status),
                tshirt_size = COALESCE($11, tshirt_size),
                shell_jacket_size = COALESCE($12, shell_jacket_size),
                total_hours = COALESCE($13, total_hours),
                membership_type = COALESCE($14, membership_type)
            WHERE member_id = $15
            RETURNING *
        `, [
            memberData.first_name,
            memberData.last_name,
            memberData.date_of_birth,
            memberData.gender,
            memberData.street_address,
            memberData.city,
            memberData.oib,
            memberData.cell_phone,
            memberData.email,
            memberData.life_status,
            memberData.tshirt_size,
            memberData.shell_jacket_size,
            memberData.total_hours,
            memberData.membership_type,
            memberId
        ]);
        return result.rows[0];
    },

    async create(memberData: MemberCreateData): Promise<Member> {
        const result = await db.query<Member>(`
            INSERT INTO members (
                first_name, last_name, date_of_birth, gender,
                street_address, city, oib, cell_phone, 
                email, life_status, tshirt_size, shell_jacket_size,
                status, role, membership_type
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                'pending', 'member', $13
            )
            RETURNING *
        `, [
            memberData.first_name,
            memberData.last_name,
            memberData.date_of_birth,
            memberData.gender,
            memberData.street_address,
            memberData.city,
            memberData.oib,
            memberData.cell_phone,
            memberData.email,
            memberData.life_status,
            memberData.tshirt_size,
            memberData.shell_jacket_size,
            memberData.membership_type
        ]);
        return result.rows[0];
    },

    async getStats(memberId: number): Promise<MemberStats> {
        const stats = await db.query<MemberStats>(`
            SELECT 
                COUNT(DISTINCT ap.activity_id) as total_activities,
                COALESCE(SUM(ap.hours_spent), 0) as total_hours,
                m.membership_type,
                m.status
            FROM members m
            LEFT JOIN activity_participants ap ON m.member_id = ap.member_id
            WHERE m.member_id = $1
            GROUP BY m.member_id, m.membership_type, m.status
        `, [memberId]);
    
        if (stats.rows.length === 0) {
            throw new Error('Member not found');
        }
    
        return stats.rows[0];
    },

    async updateProfileImage(memberId: number, imagePath: string): Promise<void> {
        await db.query(
            `UPDATE members 
             SET profile_image_path = $1, 
                 profile_image_updated_at = CURRENT_TIMESTAMP 
             WHERE member_id = $2`,
            [imagePath, memberId]
        );
    },
    
    async getProfileImage(memberId: number): Promise<string | null> {
        const result = await db.query<{ profile_image_path: string }>(
            'SELECT profile_image_path FROM members WHERE member_id = $1',
            [memberId]
        );
        return result.rows[0]?.profile_image_path || null;
    },

    async delete(memberId: number, client: PoolClient): Promise<Member | null> {
        await client.query(
            'DELETE FROM audit_logs WHERE performed_by = $1',
            [memberId]
        );;
        // First verify if period exists
        const periodCheck = await client.query(
            'SELECT EXISTS(SELECT 1 FROM membership_periods WHERE member_id = $1)',
            [memberId]
        );
    
        if (periodCheck.rows[0].exists) {
            // Explicitly delete membership period first
            await client.query(
                'DELETE FROM membership_periods WHERE member_id = $1',
                [memberId]
            );
        }
    
        // Continue with other deletions
        const deletionOrder = [
            'membership_details',
            'activity_participants',
            'member_messages',
            'annual_statistics'
        ];
    
        for (const table of deletionOrder) {
            await client.query(`DELETE FROM ${table} WHERE member_id = $1`, [memberId]);
        }
    
        // Finally delete member
        const result = await client.query<Member>(
            'DELETE FROM members WHERE member_id = $1 RETURNING *',
            [memberId]
        );
    
        return result.rows[0];
    },

    async updateRole(memberId: number, role: 'member' | 'admin' | 'superuser'): Promise<Member> {
        const result = await db.query<Member>(
            'UPDATE members SET role = $1 WHERE member_id = $2 RETURNING *',
            [role, memberId]
        );
    
        if (result.rows.length === 0) {
            throw new Error('Member not found');
        }
    
        return result.rows[0];
    },

    async assignPassword(memberId: number, password: string): Promise<void> {
        await db.query(`
            UPDATE members
            SET password_hash = $1, status = 'registered'
            WHERE member_id = $2
        `, [password, memberId]);
    },

    async updatePassword(memberId: number, password: string): Promise<void> {
        await db.query(`
            UPDATE members
            SET password_hash = $1
            WHERE member_id = $2
        `, [password, memberId]);
    }
};

export default memberRepository;