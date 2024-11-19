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
    phone: string;
    emergencyContact: string;
    notes: string;
}

export interface MemberStats {
    total_activities: number;
    total_hours: number;
    membership_type: string;
    status: string;
}

const memberRepository = {
    async findAll(): Promise<Member[]> {
        const result = await db.query<Member>(`
            SELECT m.*, u.email, u.username, u.role,
                   COALESCE(stats.total_hours, 0) as total_hours
            FROM members m
            JOIN users u ON m.user_id = u.user_id
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
        const { firstName, lastName, phone, emergencyContact, notes } = memberData;
        const result = await db.query<Member>(`
            UPDATE members
            SET first_name = $1,
                last_name = $2,
                phone = $3,
                emergency_contact = $4,
                notes = $5
            WHERE member_id = $6
            RETURNING *
        `, [firstName, lastName, phone, emergencyContact, notes, memberId]);
        return result.rows[0];
    },

    async getStats(memberId: number): Promise<MemberStats> {
        const result = await db.query<MemberStats>(`
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

    async delete(memberId: number): Promise<Member | null> {
        const result = await db.query<Member>('DELETE FROM members WHERE member_id = $1 RETURNING *', [memberId]);
        return result.rows[0] || null;
    }
};

export default memberRepository;