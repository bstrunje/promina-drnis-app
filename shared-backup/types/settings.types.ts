// promina-drnis-app/shared/types/settings.types.ts
export interface SystemSettings {
    id: string;
    cardNumberLength: number;
    renewalStartDay: number;    // Day in November (1-30)
    updatedAt: Date;
    updatedBy?: string;
  }