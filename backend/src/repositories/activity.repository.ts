import db from '../utils/db.js';
import { PoolClient } from 'pg';
import { DatabaseError } from '../utils/db.js';
import { Member } from '@shared/member.js';
import { ActivityParticipant } from '../shared/types/activity.js';

interface Activity {
    activity_id: number;
    title: string;
    description: string;
    start_date: Date;
    end_date: Date;
    location: string;
    difficulty_level: 'easy' | 'moderate' | 'difficult' | 'very_difficult' | 'extreme';
    max_participants: number;
    activity_type_id: number;
    created_by: number;
    created_at: Date;
    participants?: Array<{
        verified: boolean;
        member_id: number;
        first_name: string;
        last_name: string;
        hours_spent: number;
    }>;
    organizer_name?: string;
}

export interface ActivityCreateData {
    title: string;
    description: string;
    start_date: Date;
    end_date: Date;
    location: string;
    activity_type_id: number;
    created_by: number;
    max_participants: number;
    difficulty_level: Activity['difficulty_level'];
}

interface ActivityMember {
    participation_id: number;
    activity_id: number;
    member_id: number;
    hours_spent: number;
}

const activityRepository = {
    async findAll(): Promise<Activity[]> {
        const result = await db.query<Activity>(`
            SELECT 
                a.*,
                json_agg(
                    json_build_object(
                        'member_id', ap.member_id,
                        'first_name', m.first_name,
                        'last_name', m.last_name,
                        'hours_spent', ap.hours_spent,
                        'verified', COALESCE(ap.verified_at IS NOT NULL, false)
                    )
                ) as participants,
                u.first_name || ' ' || u.last_name as organizer_name
            FROM activities a
            LEFT JOIN activity_participants ap ON a.activity_id = ap.activity_id
            LEFT JOIN members m ON ap.member_id = m.member_id
            LEFT JOIN members u ON a.created_by = u.member_id
            GROUP BY a.activity_id, u.first_name, u.last_name
            ORDER BY a.start_date DESC
        `);
        return result.rows;
    },

    async findById(id: number): Promise<Activity | null> {
        const result = await db.query<Activity>(`
            SELECT 
                a.*,
                json_agg(
                    json_build_object(
                        'member_id', ap.member_id,
                        'first_name', m.first_name,
                        'last_name', m.last_name,
                        'hours_spent', ap.hours_spent,
                        'verified', COALESCE(ap.verified_at IS NOT NULL, false)
                    )
                ) as participants,
                u.first_name || ' ' || u.last_name as organizer_name
            FROM activities a
            LEFT JOIN activity_participants ap ON a.activity_id = ap.activity_id
            LEFT JOIN members m ON ap.member_id = m.member_id
            LEFT JOIN members u ON a.created_by = u.member_id
            WHERE a.activity_id = $1
            GROUP BY a.activity_id, u.first_name, u.last_name
        `, [id]);
        return result.rows[0] || null;
    },

    async create(activityData: ActivityCreateData): Promise<Activity> {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const activityResult = await client.query<Activity>(`
                INSERT INTO activities (
                    title, description, start_date, end_date,
                    location, activity_type_id, created_by,
                    max_participants, difficulty_level
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                activityData.title,
                activityData.description,
                activityData.start_date,
                activityData.end_date,
                activityData.location,
                activityData.activity_type_id,
                activityData.created_by,
                activityData.max_participants,
                activityData.difficulty_level
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

    async addParticipant(activityId: number, memberId: number, hoursSpent: number, client?: PoolClient): Promise<ActivityMember> {
        const query = `
            INSERT INTO activity_participants (activity_id, member_id, hours_spent, verified)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
    
        const result = client ? 
            await client.query(query, [activityId, memberId, hoursSpent]) :
            await db.query(query, [activityId, memberId, hoursSpent]);
        return result.rows[0];
    },
    
    async removeParticipant(activityId: number, memberId: number): Promise<boolean> {
        const result = await db.query(
            'DELETE FROM activity_participants WHERE activity_id = $1 AND member_id = $2',
            [activityId, memberId]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    },

    async getParticipantsCount(activityId: number): Promise<number> {
        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM activity_participants
            WHERE activity_id = $1
        `, [activityId]);
        return parseInt(result.rows[0].count);
    },

    async getParticipation(activityId: number, memberId: number): Promise<ActivityParticipant | null> {
        const result = await db.query(`
            SELECT *
            FROM activity_participants
            WHERE activity_id = $1 AND member_id = $2
        `, [activityId, memberId]);
        return result.rows[0] || null;
    },

    async getMemberActivities(memberId: number): Promise<{
        activity_id: number;
        title: string;
        date: string;
        hours_spent: number;
    }[]> {
        const result = await db.query(`
            SELECT 
                a.activity_id,
                a.title,
                a.start_date as date,
                ap.hours_spent
            FROM activities a
            JOIN activity_participants ap ON a.activity_id = ap.activity_id
            WHERE ap.member_id = $1
            ORDER BY a.start_date DESC
        `, [memberId]);
        return result.rows;
    },

    async update(id: number, updateData: Partial<ActivityCreateData>): Promise<Activity | null> {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
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
            
            return result.rows[0] || null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async delete(id: number): Promise<boolean> {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            await client.query(
                'DELETE FROM activity_participants WHERE activity_id = $1',
                [id]
            );
            
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