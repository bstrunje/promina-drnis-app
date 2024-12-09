// src/types/database.ts
import { MemberRole } from '../../../shared/types/member.js';

// Common types
type Timestamp = Date;
type TimestampTZ = Date;

// User related interfaces
export interface User {
  id: number;
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: TimestampTZ;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string | null;
  created_at: TimestampTZ;
  updated_at: TimestampTZ;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_name: string;
  granted_by: number;
  created_at: TimestampTZ;
}

// Member related interfaces
export interface Member {
  member_id: number;
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  created_at: TimestampTZ;
}

// Activity related interfaces
export interface ActivityType {
  type_id: number;
  name: string;
  description: string | null;
  created_at: Timestamp;
}

export interface Activity {
  activity_id: number;
  title: string;
  description: string | null;
  start_date: Timestamp;
  end_date: Timestamp;
  location: string | null;
  difficulty_level: DifficultyLevel | null;
  max_participants: number | null;
  created_by: number;
  created_at: Timestamp;
  activity_type_id: number;
}

export interface ActivityParticipant {
  participation_id: number;
  activity_id: number;
  member_id: number;
  hours_spent: number;
  role: ParticipantRole | null;
  notes: string | null;
  verified_by: number | null;
  verified_at: Timestamp | null;
}

export interface AnnualStatistics {
  stat_id: number;
  member_id: number;
  year: number;
  total_hours: number;
  total_activities: number;
  calculated_at: TimestampTZ;
}

// Enum-like types
export type DifficultyLevel = 'easy' | 'moderate' | 'difficult' | 'very_difficult' | 'extreme';
export type ParticipantRole = 'leader' | 'assistant' | 'participant' | 'trainee';

// Join result types
export interface MemberWithUser extends Member {
  full_name: string;
  email: string;
  role: MemberRole;
}

export interface ActivityWithType extends Activity {
  type_name: string;
  participant_count: number;
}

export interface ParticipantWithDetails extends ActivityParticipant {
  member_name: string;
  activity_title: string;
  activity_date: Timestamp;
}

// Database operation results
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  affected?: number;
}

export interface DatabaseTransactionClient {
  query: (text: string, params?: any[]) => Promise<any>;
}

// Query helper types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface FilterParams {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  search?: string;
}

// Repository response types
export interface RepositoryResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
      total?: number;
      page?: number;
      totalPages?: number;
  };
}