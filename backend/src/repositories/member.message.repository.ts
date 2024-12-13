import db from '../utils/db.js';

export interface MemberMessage {
    message_id: number;
    member_id: number;
    message_text: string;
    created_at: Date;
    read_at: Date | null;
    status: 'unread' | 'read' | 'archived';
}

const memberMessageRepository = {
    async create(memberId: number, messageText: string): Promise<MemberMessage> {
        const result = await db.query<MemberMessage>(
            `INSERT INTO member_messages (member_id, message_text)
             VALUES ($1, $2)
             RETURNING *`,
            [memberId, messageText]
        );
        return result.rows[0];
    },

    async getAllForAdmin(): Promise<MemberMessage[]> {
        const result = await db.query<MemberMessage & { sender_name: string }>(`
            SELECT mm.*, 
                   m.first_name || ' ' || m.last_name as sender_name
            FROM member_messages mm
            JOIN members m ON mm.member_id = m.member_id
            ORDER BY mm.created_at DESC
        `);
        return result.rows;
    },

    async getByMemberId(memberId: number): Promise<MemberMessage[]> {
        const result = await db.query<MemberMessage>(
            `SELECT * FROM member_messages 
             WHERE member_id = $1 
             ORDER BY created_at DESC`,
            [memberId]
        );
        return result.rows;
    },

    async markAsRead(messageId: number): Promise<void> {
        await db.query(
            `UPDATE member_messages 
             SET status = 'read', read_at = CURRENT_TIMESTAMP 
             WHERE message_id = $1`,
            [messageId]
        );
    },

    async archiveMessage(messageId: number): Promise<void> {
        await db.query(
            `UPDATE member_messages 
             SET status = 'archived' 
             WHERE message_id = $1`,
            [messageId]
        );
    }
};

export default memberMessageRepository;