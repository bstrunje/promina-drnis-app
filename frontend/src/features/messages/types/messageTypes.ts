// Definicije tipova za poruke

/**
 * Osnovni tip za poruku
 */
export interface Message {
  /**
   * Popis članova koji su pročitali poruku (ako je dostupno)
   */
  read_by?: string[];
  message_id: number;
  member_id: number;
  sender_name: string;
  message_text: string;
  created_at: string;
  status: 'unread' | 'read' | 'archived';
  sender_id?: number | null;
  sender_type?: 'admin' | 'member' | 'system';
  recipient_id?: number | null;
  recipient_type?: 'admin' | 'member' | 'group' | 'all';
}

/**
 * Tip za grupiranje poruka
 */
export interface MessageGroup {
  messages: Message[];
  key: string;
  isExpanded: boolean;
}

/**
 * Tip za člana u kontekstu poruka
 */
export interface MessageMember {
  member_id: number;
  full_name: string;
  detailed_status?: string;
  membership_type?: string;
}
