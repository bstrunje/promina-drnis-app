// shared/types/activity.ts
export interface Activity {
    activity_id: string | number;
    title: string;
    description?: string;
    start_date: Date;
    end_date: Date;
    location?: string;
    difficulty_level?: 'easy' | 'moderate' | 'difficult' | 'very_difficult' | 'extreme';
    max_participants?: number;
    created_by: number;
    created_at: Date;
    activity_type_id: number;
}

export interface ActivityCreateInput {
    title: string;
    description?: string;
    start_date: Date;
    end_date: Date;
    location?: string;
    difficulty_level?: Activity['difficulty_level'];
    max_participants?: number;
    activity_type_id: number;
    created_by?: number;
}

export interface ActivityMember {
    participation_id: number;
    activity_id: number;
    member_id: number;
    hours_spent: number;
    role?: string;
    notes?: string;
    verified_by?: number;
    verified_at?: Date;
}

export interface ActivityWithParticipants extends Activity {
    participants: ActivityMember[];
}

export interface ActivityUpdateData {
    title?: string;
    description?: string;
    start_date?: Date;
    end_date?: Date;
    location?: string;
    difficulty_level?: Activity['difficulty_level'];
    max_participants?: number;
    activity_type_id?: number;
}

export class ActivityError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'ActivityError';
    }
}