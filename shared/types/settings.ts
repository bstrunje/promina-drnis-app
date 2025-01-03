export interface SystemSettings {
  id: string;
  cardNumberLength: number;
  membershipFee: number;
  paymentDueMonths: number;
  updatedAt: Date;
  updatedBy?: string;
}
