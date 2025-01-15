// promina-drnis-app/shared/types/settings.types.ts
export interface SystemSettings {
  id: string;
  cardNumberLength: number;
  renewalStartDay: number;
  updatedAt: Date;
  updatedBy?: string;
}