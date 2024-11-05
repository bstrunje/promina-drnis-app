import db from '../utils/db.js';

const memberController = {
    // Get all members
    async getAllMembers(req, res) {
        try {
            const result = await db.query(`
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
            
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching members:', error);
            res.status(500).json({ message: 'Error fetching members' });
        }
    },

    // Get single member
    async getMemberById(req, res) {
        try {
            const { memberId } = req.params;
            const result = await db.query(`
                SELECT m.*, u.email, u.username, u.role
                FROM members m
                JOIN users u ON m.user_id = u.user_id
                WHERE m.member_id = $1
            `, [memberId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Member not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching member:', error);
            res.status(500).json({ message: 'Error fetching member details' });
        }
    },

    // Update member
    async updateMember(req, res) {
        try {
            const { memberId } = req.params;
            const { firstName, lastName, phone, emergencyContact, notes } = req.body;

            const result = await db.query(`
                UPDATE members
                SET first_name = $1,
                    last_name = $2,
                    phone = $3,
                    emergency_contact = $4,
                    notes = $5
                WHERE member_id = $6
                RETURNING *
            `, [firstName, lastName, phone, emergencyContact, notes, memberId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Member not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating member:', error);
            res.status(500).json({ message: 'Error updating member' });
        }
    },

    // Get member statistics
    async getMemberStats(req, res) {
        try {
            const { memberId } = req.params;
            
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

            res.json(stats.rows[0] || { 
                total_activities: 0, 
                total_hours: 0, 
                membership_type: 'passive', 
                status: 'inactive' 
            });
        } catch (error) {
            console.error('Error fetching member statistics:', error);
            res.status(500).json({ message: 'Error fetching member statistics' });
        }
    },

    // Create a new member
    async createMember(req, res) {
        try {
            const { firstName, lastName, email, phone, emergencyContact, notes } = req.body;
            const result = await db.query(`
                INSERT INTO members (first_name, last_name, email, phone, emergency_contact, notes)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [firstName, lastName, email, phone, emergencyContact, notes]);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating member:', error);
            res.status(500).json({ message: 'Error creating member' });
        }
    },

    // Delete a member
    async deleteMember(req, res) {
        try {
            const { memberId } = req.params;
            const result = await db.query('DELETE FROM members WHERE member_id = $1 RETURNING *', [memberId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Member not found' });
            }

            res.json({ message: 'Member deleted successfully' });
        } catch (error) {
            console.error('Error deleting member:', error);
            res.status(500).json({ message: 'Error deleting member' });
        }
    }
};

export default memberController;