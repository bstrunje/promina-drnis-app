// promina-drnis-app/shared/types/settings.types.ts
export interface SystemSettings {
  id: string;
  cardNumberLength: number;
  renewalStartDay: number;
  renewalStartMonth: number;
  updatedAt?: Date;
  updatedBy?: string;
}