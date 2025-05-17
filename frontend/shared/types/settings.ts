export interface SystemSettings {
  renewalStartDay: string | number | readonly string[] | undefined;
  renewalStartMonth: string | number | readonly string[] | undefined;
  timeZone: string;
  id: string;
  cardNumberLength: number;
  membershipFee: number;
  paymentDueMonths: number;
  updatedAt: Date;
  updatedBy?: string;
}
