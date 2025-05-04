import db from '../utils/db.js';

export interface MemberMessage {
    message_id: number;
    member_id: number | null;
    message_text: string;
    created_at: Date;
    read_at: Date | null;
    status: 'unread' | 'read' | 'archived';
    sender_id: number | null;
    recipient_id: number | null;
    recipient_type: 'admin' | 'member' | 'group' | 'all';
    sender_type: 'admin' | 'member';
}

export interface MemberMessageWithSender extends MemberMessage {
    sender_name: string;
}

const memberMessageRepository = {
    async create(memberId: number, messageText: string): Promise<MemberMessage> {
        const result = await db.query<MemberMessage>(
            `INSERT INTO member_messages (member_id, message_text, sender_id, sender_type, recipient_type)
             VALUES ($1, $2, $1, 'member', 'admin')
             RETURNING *`,
            [memberId, messageText]
        );
        return result.rows[0];
    },

    async createAdminMessage(
        senderId: number, 
        recipientId: number | null, 
        messageText: string, 
        recipientType: 'member' | 'group' | 'all' = 'member'
    ): Promise<MemberMessage> {
        const result = await db.query<MemberMessage>(
            `INSERT INTO member_messages 
                (message_text, sender_id, sender_type, recipient_id, recipient_type)
             VALUES ($1, $2, 'admin', $3, $4)
             RETURNING *`,
            [messageText, senderId, recipientId, recipientType]
        );
        return result.rows[0];
    },

    async getAllForAdmin(): Promise<MemberMessageWithSender[]> {
        const result = await db.query<MemberMessageWithSender>(`
            SELECT mm.*, 
                   m.first_name || ' ' || m.last_name as sender_name
            FROM member_messages mm
            JOIN members m ON mm.member_id = m.member_id
            WHERE mm.recipient_type = 'admin'
            ORDER BY mm.created_at DESC
        `);
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at) // Ensure created_at is a Date object
        }));
    },

    async getByMemberId(memberId: number): Promise<MemberMessage[]> {
        // Poboljšani SQL upit s detaljnijim komentarima za bolje razumijevanje
        const result = await db.query<MemberMessage>(
            `SELECT mm.* FROM member_messages mm
             WHERE 
                -- Poruke koje je član sam poslao adminu
                (mm.member_id = $1 AND mm.recipient_type = 'admin') 
                
                -- Poruke koje su poslane direktno ovom članu
                OR (mm.recipient_id = $1 AND mm.recipient_type = 'member') 
                
                -- Grupne poruke gdje je član dio grupe primatelja
                OR (mm.recipient_id = $1 AND mm.recipient_type = 'group')
                
                -- Poruke poslane svim članovima (prikazuju se svima)
                OR (mm.recipient_type = 'all' AND mm.sender_type = 'admin')
                
             ORDER BY mm.created_at DESC`,
            [memberId]
        );
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at) // Ensure created_at is a Date object
        }));
    },

    async getMessagesSentByAdmin(adminId: number): Promise<MemberMessageWithSender[]> {
        const result = await db.query<MemberMessageWithSender>(`
            SELECT mm.*, 
                   CASE 
                     WHEN mm.recipient_id IS NOT NULL THEN 
                        (SELECT m.first_name || ' ' || m.last_name 
                         FROM members m 
                         WHERE m.member_id = mm.recipient_id)
                     WHEN mm.recipient_type = 'all' THEN 'All Members'
                     ELSE 'Multiple Recipients' 
                   END as sender_name
            FROM member_messages mm
            WHERE mm.sender_id = $1 
              AND mm.sender_type = 'admin'
            ORDER BY mm.created_at DESC
        `, [adminId]);
        
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at)
        }));
    },

    async getMessagesByGroup(groupIds: number[]): Promise<MemberMessage[]> {
        if (groupIds.length === 0) return [];
        
        const placeholders = groupIds.map((_, index) => `$${index + 1}`).join(', ');
        const result = await db.query<MemberMessage>(
            `SELECT * FROM member_messages 
             WHERE recipient_id IN (${placeholders}) 
                OR (recipient_type = 'all')
             ORDER BY created_at DESC`,
            groupIds
        );
        
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at)
        }));
    },

    async getMessagesForAllMembers(): Promise<MemberMessage[]> {
        const result = await db.query<MemberMessage>(
            `SELECT * FROM member_messages 
             WHERE recipient_type = 'all'
             ORDER BY created_at DESC`
        );
        
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at)
        }));
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
    },

    async deleteMessage(messageId: number): Promise<void> {
        await db.query(
            `DELETE FROM member_messages WHERE message_id = $1`,
            [messageId]
        );
    },

    async deleteAllMessages(): Promise<void> {
        await db.query(`DELETE FROM member_messages`);
    },

    async messageExists(messageId: number): Promise<boolean> {
        const result = await db.query(
            `SELECT 1 FROM member_messages WHERE message_id = $1`,
            [messageId]
        );
        return result.rowCount !== null && result.rowCount > 0;
    }
};

export default memberMessageRepository;