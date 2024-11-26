// backend/src/repositories/activity.repository.ts
import db from '../utils/db.js';
import { PoolClient } from 'pg';

interface Activity {
    created_at: Date;
    difficulty_level: any;
    activity_id: number;
    title: string;
    description: string;
    start_date: Date;
    end_date: Date;
    location: string;
    activity_type_id: number;
    created_by: number;
    max_participants: number;
    members?: Array<{
        member_id: number;
        first_name: string;
        last_name: string;
        hours_spent: number;
    }>;
    organizer_name?: string;
}

interface ActivityCreateData {
    title: string;
    description: string;
    start_date: Date;
    end_date: Date;
    location: string;
    activity_type_id: number;
    created_by: number;
    max_participants: number;
}

interface ActivityMember {
    participation_id: number;
    activity_id: string | number;
    member_id: number;
    hours_spent: number;
}

interface ActivityMemberStats {
    participation_id: number;
    activity_id: number;
    member_id: number;
    hours_spent: number;
    role: string;
    verified_at?: Date;
    verified_by?: number;
}

const activityRepository = {
    async findAll(): Promise<Activity[]> {
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

        const result = await db.query(query);
        return result.rows;
    },

    async findById(id: string | number): Promise<Activity | null> {  // Updated parameter type
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

        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    },

    async create(activityData: ActivityCreateData): Promise<Activity> {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
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
            throw error;
        } finally {
            client.release();
        }
    },

    async addMember(activityId: string | number, memberId: number, hoursSpent: number, client?: PoolClient): Promise<ActivityMember> {
        const query = `
            INSERT INTO activity_participants (activity_id, member_id, hours_spent)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
    
        const result = client ? 
            await client.query(query, [activityId, memberId, hoursSpent]) :
            await db.query(query, [activityId, memberId, hoursSpent]);
        return result.rows[0];
    },
    
    async removeMember(activityId: string | number, memberId: number, client?: PoolClient): Promise<boolean> {
        const query = `
            DELETE FROM activity_participants
            WHERE activity_id = $1 AND member_id = $2
        `;
    
        const result = client ? 
            await client.query(query, [activityId, memberId]) :
            await db.query(query, [activityId, memberId]);
        return true;
    },

    // Added missing methods referenced in service
    async getParticipantsCount(activityId: string | number): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM activity_participants
            WHERE activity_id = $1
        `;

        const result = await db.query(query, [activityId]);
        return parseInt(result.rows[0].count);
    },

    async getMembership(activityId: string | number, memberId: number): Promise<ActivityMember | null> {
        const query = `
            SELECT *
            FROM activity_participants
            WHERE activity_id = $1 AND member_id = $2
        `;

        const result = await db.query(query, [activityId, memberId]);
        return result.rows[0] || null;
    },

    async update(id: string | number, updateData: Partial<ActivityCreateData>): Promise<Activity | null> {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Build the update query dynamically based on provided fields
            const updateFields: string[] = [];
            const values: any[] = [];
            let parameterCount = 1;
            
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateFields.push(`${key} = $${parameterCount}`);
                    values.push(value);
                    parameterCount++;
                }
            });
            
            if (updateFields.length === 0) {
                return await this.findById(id);
            }
            
            values.push(id);
            const updateQuery = `
                UPDATE activities
                SET ${updateFields.join(', ')}
                WHERE activity_id = $${parameterCount}
                RETURNING *
            `;
            
            const result = await client.query(updateQuery, values);
            await client.query('COMMIT');
            
            if (result.rows.length === 0) {
                return null;
            }
            
            // Fetch the updated activity with all related data
            return await this.findById(id);
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async delete(id: string | number): Promise<boolean> {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // First delete all participant records
            await client.query(
                'DELETE FROM activity_participants WHERE activity_id = $1',
                [id]
            );
            
            // Then delete the activity
            const result = await client.query(
                'DELETE FROM activities WHERE activity_id = $1',
                [id]
            );
            
            await client.query('COMMIT');
            return result.rowCount ? result.rowCount > 0 : false;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } 
};

export default activityRepository;