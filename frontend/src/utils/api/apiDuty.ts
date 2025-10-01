import apiInstance from './apiConfig';

// TypeScript tipovi za Duty Calendar
export interface DutyActivity {
  activity_id: number;
  name: string;
  start_date: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  participants: {
    participation_id: number;
    member_id: number;
    member: {
      member_id: number;
      full_name: string;
    };
  }[];
  activity_type: {
    type_id: number;
    key: string;
    name: string;
  };
  organizer: {
    member_id: number;
    full_name: string;
  };
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  is_recurring: boolean;
  created_by?: number;
  created_at: string;
}

export interface DutyScheduleInfo {
  winter: {
    months: string;
    days: string;
    hours: string;
    duration: number;
  };
  summer: {
    months: string;
    days: string;
    hours: string;
    duration: number;
  };
  summerPeak: {
    months: string;
    days: string;
    hours: string;
    duration: number;
  };
}

export interface DutySettings {
  dutyCalendarEnabled: boolean | null;
  dutyMaxParticipants: number | null;
  dutyAutoCreateEnabled: boolean | null;
  scheduleInfo: DutyScheduleInfo;
}

export interface DutyCalendarData {
  duties: DutyActivity[];
  holidays: Holiday[];
  settings: {
    dutyCalendarEnabled: boolean | null;
    dutyMaxParticipants: number | null;
    dutyAutoCreateEnabled: boolean | null;
  };
  scheduleInfo: DutyScheduleInfo;
}

/**
 * API funkcije za Duty Calendar
 */
export const dutyApi = {
  /**
   * Dohvaća kompletan kalendar za mjesec (duties + holidays + settings)
   */
  getCalendarMonth: async (year: number, month: number): Promise<DutyCalendarData> => {
    const response = await apiInstance.get<DutyCalendarData>(`/duty/calendar/${year}/${month}`);
    return response.data;
  },

  /**
   * Dohvaća samo dežurstva za mjesec
   */
  getDutiesForMonth: async (year: number, month: number): Promise<DutyActivity[]> => {
    const response = await apiInstance.get<DutyActivity[]>(`/duty/duties/${year}/${month}`);
    return response.data;
  },

  /**
   * Dohvaća duty settings i schedule info
   */
  getSettings: async (): Promise<DutySettings> => {
    const response = await apiInstance.get<DutySettings>('/duty/settings');
    return response.data;
  },

  /**
   * Kreira novo dežurstvo ili pridružuje člana postojećem
   */
  createDutyShift: async (date: string): Promise<DutyActivity> => {
    const response = await apiInstance.post<DutyActivity>('/duty/create', { date });
    return response.data;
  }
};

/**
 * System Manager API funkcije za upravljanje praznicima i duty settings
 * Dostupno samo System Manageru
 */
export const systemManagerDutyApi = {
  // --- Holidays Management ---
  
  /**
   * Dohvaća sve praznike
   */
  getAllHolidays: async (): Promise<Holiday[]> => {
    const response = await apiInstance.get<Holiday[]>('/system-manager/holidays');
    return response.data;
  },

  /**
   * Dohvaća praznike za određenu godinu
   */
  getHolidaysForYear: async (year: number): Promise<Holiday[]> => {
    const response = await apiInstance.get<Holiday[]>(`/system-manager/holidays/${year}`);
    return response.data;
  },

  /**
   * Kreira novi praznik
   */
  createHoliday: async (data: Omit<Holiday, 'id' | 'created_at'>): Promise<Holiday> => {
    const response = await apiInstance.post<Holiday>('/system-manager/holidays', data);
    return response.data;
  },

  /**
   * Ažurira postojeći praznik
   */
  updateHoliday: async (id: number, data: Partial<Omit<Holiday, 'id' | 'created_at'>>): Promise<Holiday> => {
    const response = await apiInstance.put<Holiday>(`/system-manager/holidays/${id}`, data);
    return response.data;
  },

  /**
   * Briše praznik
   */
  deleteHoliday: async (id: number): Promise<void> => {
    await apiInstance.delete(`/system-manager/holidays/${id}`);
  },

  /**
   * Seeduje default hrvatske praznike za godinu
   */
  seedDefaultHolidays: async (year: number): Promise<{
    created: number;
    skipped: number;
    details: {
      createdHolidays: string[];
      skippedHolidays: string[];
    };
  }> => {
    const response = await apiInstance.post<{
      created: number;
      skipped: number;
      details: {
        createdHolidays: string[];
        skippedHolidays: string[];
      };
    }>('/system-manager/holidays/seed', { year });
    return response.data;
  },

  /**
   * Briše sve praznike za godinu
   */
  deleteHolidaysForYear: async (year: number): Promise<{ count: number; message?: string }> => {
    const response = await apiInstance.delete<{ count: number; message?: string }>(`/system-manager/holidays/year/${year}`);
    return response.data;
  },

  // --- Duty Calendar Settings ---

  /**
   * Dohvaća duty calendar settings
   */
  getDutySettings: async (): Promise<DutySettings> => {
    const response = await apiInstance.get<DutySettings>('/system-manager/duty-settings');
    return response.data;
  },

  /**
   * Ažurira duty calendar settings
   */
  updateDutySettings: async (settings: {
    dutyCalendarEnabled?: boolean;
    dutyMaxParticipants?: number;
    dutyAutoCreateEnabled?: boolean;
  }): Promise<{
    id: string;
    dutyCalendarEnabled: boolean | null;
    dutyMaxParticipants: number | null;
    dutyAutoCreateEnabled: boolean | null;
  }> => {
    const response = await apiInstance.put<{
      id: string;
      dutyCalendarEnabled: boolean | null;
      dutyMaxParticipants: number | null;
      dutyAutoCreateEnabled: boolean | null;
    }>('/system-manager/duty-settings', settings);
    return response.data;
  }
};
