const db = require('../utils/db');

const activityController = {
    // Get all activities
    async getAllActivities(req, res) {
        try {
            const result = await db.query(`
                SELECT a.*, 
                       u.username as created_by_username,
                       COUNT(DISTINCT ap.member_id) as participant_count
                FROM activities a
                LEFT JOIN users u ON a.created_by = u.user_id
                LEFT JOIN activity_participants ap ON a.activity_id = ap.activity_id
                GROUP BY a.activity_id, u.username
                ORDER BY a.start_date DESC
            `);

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching activities:', error);
            res.status(500).json({ message: 'Error fetching activities' });
        }
    },

    // Create new activity
    async createActivity(req, res) {
        try {
            const { title, description, startDate, endDate, location, difficultyLevel, maxParticipants } = req.body;

            const result = await db.query(`
                INSERT INTO activities (
                    title, description, start_date, end_date, 
                    location, difficulty_level, max_participants, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                title, description, startDate, endDate, 
                location, difficultyLevel, maxParticipants, req.user.userId
            ]);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating activity:', error);
            res.status(500).json({ message: 'Error creating activity' });
        }
    },

    // Record participation
    async recordParticipation(req, res) {
        try {
            const { activityId } = req.params;
            const { memberId, hoursSpent, role, notes } = req.body;

            const result = await db.query(`
                INSERT INTO activity_participants (
                    activity_id, member_id, hours_spent, 
                    role, notes, verified_by, verified_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                RETURNING *
            `, [
                activityId, memberId, hoursSpent, 
                role, notes, req.user.userId
            ]);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error recording participation:', error);
            res.status(500).json({ message: 'Error recording participation' });
        }
    }
};

module.exports = activityController;