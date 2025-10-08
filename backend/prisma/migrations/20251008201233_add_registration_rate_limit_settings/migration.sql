-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "registration_max_attempts" INTEGER DEFAULT 5,
ADD COLUMN     "registration_rate_limit_enabled" BOOLEAN DEFAULT true,
ADD COLUMN     "registration_window_ms" INTEGER DEFAULT 900000;
