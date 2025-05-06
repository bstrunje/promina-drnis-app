// promina-drnis-app/frontend/shared/types/settings.types.ts
export interface SystemSettings {
  id: string;
  cardNumberLength?: number; // Opcionalno - sada pod kontrolom System Administratora
  renewalStartDay: number;
  renewalStartMonth: number;
  timeZone?: string; // Dodajemo postavku za vremensku zonu (npr. 'Europe/Zagreb')
  updatedAt?: Date;
  updatedBy?: string;
}