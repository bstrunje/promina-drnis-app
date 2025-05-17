// Tipovi za komponente Admin Dashboarda

export interface StampTypeData {
  initial: number;
  issued: number;
  remaining: number;
}

export interface YearlyInventory {
  employedStamps: StampTypeData;
  studentStamps: StampTypeData;
  pensionerStamps: StampTypeData;
}

/**
 * Tip za poruke administratora
 */
export interface AdminMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string | null;
  recipient_name: string | null;
  subject: string;
  content: string;
  created_at: string;
  status: "read" | "unread";
  is_group_message: boolean;
  recipients?: {
    id: string;
    name: string;
    read_status: "read" | "unread";
  }[];
}

export type StampInventory = Record<number, YearlyInventory>;

export interface InventoryData {
  stamp_type: "employed" | "student" | "pensioner";
  stamp_year: number;
  initial_count: number;
  issued_count: number;
  remaining: number;
}

export interface StampHistoryItem {
  id: string;
  year: number;
  stamp_type: "employed" | "student" | "pensioner";
  initial_count: number;
  issued_count: number;
  reset_date: string;
  reset_by_name: string;
  notes: string | null;
}

/**
 * Tip za rezultat arhiviranja inventara
 */
export interface ArchiveResult {
  success: boolean;
  message: string;
}
