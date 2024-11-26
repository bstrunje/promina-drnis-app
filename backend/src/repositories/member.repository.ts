// backend/src/repositories/member.repository.ts
import db from '../utils/db.js';

export interface Member {
    member_id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    emergency_contact: string;
    notes: string;
    membership_type: string;
    status: string;
    username: string;
    role: string;
    total_hours?: number;
}

export interface MemberCreateData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContact: string;
    notes: string;
}

export interface MemberUpdateData {
    firstName: string;
    lastName: string;
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status: string;
    tshirt_size: string;
    shell_jacket_size: string;
    total_hours?: number;
}

export interface MemberStats {
    total_activities: number;
    total_hours: number;
    membership_type: 'active' | 'passive';
    status: 'active' | 'pending' | 'inactive';
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

    async findById(memberId: number): Promise<Member | null> {
        const result = await db.query<Member>(`
            SELECT m.*, u.email, u.username, u.role
            FROM members m
            JOIN users u ON m.user_id = u.user_id
            WHERE m.member_id = $1
        `, [memberId]);
        return result.rows[0] || null;
    },

    async update(memberId: number, memberData: MemberUpdateData): Promise<Member> {
        const result = await db.query<Member>(`
            UPDATE members
            SET first_name = $1,
                last_name = $2,
                street_address = $3,
                city = $4,
                oib = $5,
                cell_phone = $6,
                email = $7,
                life_status = $8,
                tshirt_size = $9,
                shell_jacket_size = $10,
                total_hours = $11
            WHERE member_id = $12
            RETURNING *
        `, [
            memberData.firstName,
            memberData.lastName,
            memberData.street_address,
            memberData.city,
            memberData.oib,
            memberData.cell_phone,
            memberData.email,
            memberData.life_status,
            memberData.tshirt_size,
            memberData.shell_jacket_size,
            memberData.total_hours || 0,
            memberId
        ]);
        return result.rows[0];
    },

    async create(memberData: MemberCreateData): Promise<Member> {
        const { firstName, lastName, email, phone, emergencyContact, notes } = memberData;
        const result = await db.query<Member>(`
            INSERT INTO members (first_name, last_name, email, phone, emergency_contact, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [firstName, lastName, email, phone, emergencyContact, notes]);
        return result.rows[0];
    },
    async getStats(memberId: number): Promise<MemberStats> {
        const stats = await db.query(`
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

    async delete(memberId: number): Promise<Member | null> {
        const result = await db.query<Member>('DELETE FROM members WHERE member_id = $1 RETURNING *', [memberId]);
        return result.rows[0] || null;
    }
};

export default memberRepository;