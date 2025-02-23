export interface Activity {
  activity_id: number;
  title: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  location: string | null;
  difficulty_level: string | null;
  max_participants: number | null;
  created_by: number;
  activity_type_id: number;
}
