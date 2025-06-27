export interface ActivityType {
  type_id: number;
  name: string;
  description: string | null;
}

export enum ActivityStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
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
