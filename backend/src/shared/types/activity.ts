// shared/types/activity.ts
import { Member } from './member.js';

export type DifficultyLevel = 'easy' | 'moderate' | 'difficult' | 'very_difficult' | 'extreme';
export type ActivityType = 'hiking' | 'climbing' | 'training' | 'maintenance' | 'social' | 'community' | 'general';

// ...rest of the activity types...

export interface Activity {
    activity_id: number;
    title: string;
    description: string;
    start_date: Date;
    end_date: Date;
    location: string;
    difficulty_level: DifficultyLevel;
    max_participants: number;
    activity_type_id: number;
    created_by: number;
    created_at: Date;
    participants?: ActivityParticipant[];
    organizer_name?: string;
}

export interface ActivityParticipant {
    member_id: number;
    first_name: string;
    last_name: string;
    hours_spent: number;
    verified: boolean;
}

export interface ActivityCreateInput {
    title: string;
    description?: string;
    start_date: Date;
    end_date: Date;
    location?: string;
    activity_type_id: number;
    difficulty_level?: DifficultyLevel;
    max_participants?: number;
    created_by?: number;
}

export interface ActivityUpdateData {
    title?: string;
    description?: string;
    start_date?: Date;
    end_date?: Date;
    location?: string;
    difficulty_level?: DifficultyLevel;
    max_participants?: number;
    activity_type_id?: number;
}

export interface ActivityMember {
    participation_id: number;
    activity_id: number;
    member_id: number;
    hours_spent: number;
    role?: string;
    notes?: string;
    verified_at?: Date;
    verified_by?: number;
}

export class ActivityError extends Error {
    constructor(
        message: string,
        public code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CREATE_ERROR' | 
                   'UPDATE_ERROR' | 'DELETE_ERROR' | 'FETCH_ERROR' | 
                   'FETCH_ALL_ERROR' | 'ADD_MEMBER_ERROR' | 'REMOVE_MEMBER_ERROR' |
                   'MAX_PARTICIPANTS'
    ) {
        super(message);
        this.name = 'ActivityError';
    }
}