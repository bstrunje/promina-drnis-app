// promina-drnis-app/frontend/shared/types/settings.types.ts
export interface SystemSettings {
  id: string;
  cardNumberLength?: number; // Opcionalno - sada pod kontrolom System Administratora
  renewalStartDay: number;
  renewalStartMonth: number;
  timeZone?: string; // Dodajemo postavku za vremensku zonu (npr. 'Europe/Zagreb')
  membershipTerminationDay?: number; // Dan u mjesecu kada se automatski završavaju članstva
  membershipTerminationMonth?: number; // Mjesec kada se automatski završavaju članstva (1-12)
  updatedAt?: Date;
  updatedBy?: string;
}