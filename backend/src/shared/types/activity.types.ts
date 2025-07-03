export interface ActivityType {
  type_id: number;
  name: string;
  description: string | null;
  key: string;
}

export enum ActivityStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  total_minutes?: number;
}

export interface Activity {
  activity_id: number;
  name: string;
  description: string | null;
  type_id: number;
  organizer_id: number;
  status: ActivityStatus;
  start_date: Date | string;
  actual_start_time: (Date | string) | null;
  actual_end_time: (Date | string) | null;
  recognition_percentage: number;
  created_at: Date | string;
  updated_at: Date | string;
  cancellation_reason: string | null;

  // Relational fields for detailed views
  activity_type?: ActivityType;
  organizer?: Member;
  participants?: Array<ActivityParticipation & { 
    member: Member; 
  }>;
  _count?: {
    participants: number;
  };
}

export interface ActivityParticipation {
  participation_id: number;
  activity_id: number;
  member_id: number;
  start_time?: Date | string | null;
  end_time?: Date | string | null;
  manual_hours?: number | null;
  recognition_override?: number | null;
  created_at: Date | string;
}
