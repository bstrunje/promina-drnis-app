import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

// Get all activities
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'member_id', ap.member_id,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'hours_spent', ap.hours_spent
          )
        ) FILTER (WHERE ap.member_id IS NOT NULL) as members,
        json_build_object(
          'id', u.id,
          'username', u.username
        ) as organizer
      FROM activities a
      LEFT JOIN activity_participants ap ON a.activity_id = ap.activity_id
      LEFT JOIN members m ON ap.member_id = m.member_id
      LEFT JOIN users u ON a.created_by = u.id
      GROUP BY a.activity_id, u.id, u.username
      ORDER BY a.start_date DESC
    `;
    
    const activities = await db.query(query);
    res.json(activities.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activities', error: err.message });
  }
});

// Get an activity by ID
router.get('/:id', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'member_id', ap.member_id,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'hours_spent', ap.hours_spent
          )
        ) FILTER (WHERE ap.member_id IS NOT NULL) as members,
        json_build_object(
          'id', u.id,
          'username', u.username
        ) as organizer
      FROM activities a
      LEFT JOIN activity_participants ap ON a.activity_id = ap.activity_id
      LEFT JOIN members m ON ap.member_id = m.member_id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.activity_id = $1
      GROUP BY a.activity_id, u.id, u.username
    `;
    
    const result = await db.query(query, [req.params.id]);
    const activity = result.rows[0];
    
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activity', error: err.message });
  }
});

// Create a new activity
router.post('/', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { type, title, date, description, location, hoursSpent, organizer, maxParticipants, equipmentNeeded } = req.body;

    if (!type || !title || !date || !description || !hoursSpent || !organizer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const activityQuery = `
      INSERT INTO activities (
        activity_type_id,
        title,
        start_date,
        end_date,
        description,
        location,
        max_participants,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const activityResult = await client.query(activityQuery, [
      type,
      title,
      date,
      date, // You might want to add end_date separately
      description,
      location,
      maxParticipants,
      organizer
    ]);

    await client.query('COMMIT');
    res.status(201).json(activityResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error creating activity', error: err.message });
  } finally {
    client.release();
  }
});

// Update an activity
router.put('/:id', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { type, title, date, description, location, hoursSpent, organizer, status, maxParticipants, equipmentNeeded } = req.body;

    const updateQuery = `
      UPDATE activities
      SET 
        activity_type_id = $1,
        title = $2,
        start_date = $3,
        description = $4,
        location = $5,
        max_participants = $6,
        created_by = $7
      WHERE activity_id = $8
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      type,
      title,
      date,
      description,
      location,
      maxParticipants,
      organizer,
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error updating activity', error: err.message });
  } finally {
    client.release();
  }
});

// Delete an activity
router.delete('/:id', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // First delete related records in activity_participants
    await client.query('DELETE FROM activity_participants WHERE activity_id = $1', [req.params.id]);
    
    // Then delete the activity
    const result = await client.query('DELETE FROM activities WHERE activity_id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error deleting activity', error: err.message });
  } finally {
    client.release();
  }
});

// Add a member to an activity
router.post('/:id/members', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { memberId, hoursContributed } = req.body;
    
    // Check if activity exists
    const activityCheck = await client.query('SELECT * FROM activities WHERE activity_id = $1', [req.params.id]);
    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Add member to activity
    const insertQuery = `
      INSERT INTO activity_participants (activity_id, member_id, hours_spent)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [req.params.id, memberId, hoursContributed]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error adding member to activity', error: err.message });
  } finally {
    client.release();
  }
});

// Remove a member from an activity
router.delete('/:id/members/:memberId', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'DELETE FROM activity_participants WHERE activity_id = $1 AND member_id = $2 RETURNING *',
      [req.params.id, req.params.memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found in activity' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Member removed from activity successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error removing member from activity', error: err.message });
  } finally {
    client.release();
  }
});

export default router;