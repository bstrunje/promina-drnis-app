-- AlterTable
ALTER TABLE "members" ADD COLUMN     "two_factor_confirmed_at" TIMESTAMP(6),
ADD COLUMN     "two_factor_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "two_factor_preferred_channel" VARCHAR(10),
ADD COLUMN     "two_factor_recovery_codes_hash" JSONB,
ADD COLUMN     "two_factor_secret" VARCHAR(255);

-- AlterTable
ALTER TABLE "system_manager" ADD COLUMN     "two_factor_confirmed_at" TIMESTAMP(6),
ADD COLUMN     "two_factor_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "two_factor_preferred_channel" VARCHAR(10),
ADD COLUMN     "two_factor_recovery_codes_hash" JSONB,
ADD COLUMN     "two_factor_secret" VARCHAR(255);

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "two_factor_channel_email_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "two_factor_channel_sms_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "two_factor_channel_totp_enabled" BOOLEAN DEFAULT true,
ADD COLUMN     "two_factor_global_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "two_factor_max_attempts_per_hour" INTEGER DEFAULT 10,
ADD COLUMN     "two_factor_members_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "two_factor_otp_expiry_seconds" INTEGER DEFAULT 300,
ADD COLUMN     "two_factor_remember_device_days" INTEGER DEFAULT 30,
ADD COLUMN     "two_factor_require_for_system_manager" BOOLEAN DEFAULT true,
ADD COLUMN     "two_factor_required_member_permissions" JSONB,
ADD COLUMN     "two_factor_required_member_roles" JSONB,
ADD COLUMN     "two_factor_totp_step_seconds" INTEGER DEFAULT 30,
ADD COLUMN     "two_factor_totp_window" INTEGER DEFAULT 1;
