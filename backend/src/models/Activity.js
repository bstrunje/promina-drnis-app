import db from '../utils/db.js';

class Activity {
  static async getAll() {
    const query = `
      SELECT 
        a.*,
        json_agg(
          json_build_object(
            'member_id', ap.member_id,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'hours_spent', ap.hours_spent
          )
        ) as members,
        u.username as organizer_name
      FROM activities a
      LEFT JOIN activity_participants ap ON a.activity_id = ap.activity_id
      LEFT JOIN members m ON ap.member_id = m.member_id
      LEFT JOIN users u ON a.created_by = u.id
      GROUP BY a.activity_id, u.username
      ORDER BY a.start_date DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in Activity.getAll:', error);
      throw error;
    }
  }

  static async getById(id) {
    const query = `
      SELECT 
        a.*,
        json_agg(
          json_build_object(
            'member_id', ap.member_id,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'hours_spent', ap.hours_spent
          )
        ) as members,
        u.username as organizer_name
      FROM activities a
      LEFT JOIN activity_participants ap ON a.activity_id = ap.activity_id
      LEFT JOIN members m ON ap.member_id = m.member_id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.activity_id = $1
      GROUP BY a.activity_id, u.username
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in Activity.getById:', error);
      throw error;
    }
  }

  static async create(activityData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insert activity
      const activityQuery = `
        INSERT INTO activities (
          title, description, start_date, end_date,
          location, activity_type_id, created_by,
          max_participants
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const activityResult = await client.query(activityQuery, [
        activityData.title,
        activityData.description,
        activityData.start_date,
        activityData.end_date,
        activityData.location,
        activityData.activity_type_id,
        activityData.created_by,
        activityData.max_participants
      ]);

      await client.query('COMMIT');
      return activityResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in Activity.create:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async addMember(activityId, memberId, hoursSpent) {
    const query = `
      INSERT INTO activity_participants (activity_id, member_id, hours_spent)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    try {
      const result = await db.query(query, [activityId, memberId, hoursSpent]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in Activity.addMember:', error);
      throw error;
    }
  }

  static async removeMember(activityId, memberId) {
    const query = `
      DELETE FROM activity_participants
      WHERE activity_id = $1 AND member_id = $2
    `;

    try {
      await db.query(query, [activityId, memberId]);
      return true;
    } catch (error) {
      console.error('Error in Activity.removeMember:', error);
      throw error;
    }
  }
}

export default Activity;