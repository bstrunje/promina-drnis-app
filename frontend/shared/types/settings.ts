export interface SystemSettings {
  id: string;
  organization_id?: number | null;

  // General settings
  timeZone?: string | null;
  cardNumberLength?: number | null;

  // Membership renewal settings
  renewalStartDay?: number | null;
  renewalStartMonth?: number | null;
  membershipTerminationDay?: number | null;
  membershipTerminationMonth?: number | null;

  // Registration rate limit settings
  registrationRateLimitEnabled?: boolean | null;
  registrationWindowMs?: number | null;
  registrationMaxAttempts?: number | null;

  // Two-factor authentication settings
  twoFactorGlobalEnabled?: boolean | null;
  twoFactorMembersEnabled?: boolean | null;
  twoFactorRequiredMemberRoles?: string[] | null;
  twoFactorRequiredMemberPermissions?: string[] | null;
  twoFactorOtpExpirySeconds?: number | null;
  twoFactorRememberDeviceDays?: number | null;
  twoFactorChannelEmailEnabled?: boolean | null;
  twoFactorChannelSmsEnabled?: boolean | null;
  twoFactorChannelTotpEnabled?: boolean | null;
  twoFactorChannelPinEnabled?: boolean | null;
  twoFactorTrustedDevicesEnabled?: boolean | null;
  twoFactorRequireForSystemManager?: boolean | null;
  twoFactorTotpStepSeconds?: number | null;
  twoFactorTotpWindow?: number | null;
  twoFactorMaxAttemptsPerHour?: number | null;

  // Duty calendar settings
  dutyCalendarsEnabled?: boolean | null;
  dutyAutoCreateEnables?: boolean | null;
  dutyYearParticipants?: number | null;

  // Backup settings
  backupFrequency?: string | null;
  backupRetentionDays?: number | null;
  backupStorageLocation?: string | null;
  lastBackupAt?: Date | string | null;
  nextBackupAt?: Date | string | null;

  // Password generation settings
  passwordGenerationStrategy?: 'FULLNAME_ISK_CARD' | 'RANDOM_8' | 'EMAIL_PREFIX_CARD_SUFFIX' | null;
  passwordSeparator?: string | null;
  passwordCardDigits?: number | null;

  // Activity settings
  activityHoursThreshold?: number | null;
  activityRoleRecognition?: Record<string, number> | null; // { "GUIDE": 100, "ASSISTANT_GUIDE": 50, ... }

  // Activities selectors behavior (Superuser Settings)
  allowFormerMembersInSelectors?: boolean | null;

  // Audit
  updatedAt?: Date | string;
  updatedBy?: number | null;
}
