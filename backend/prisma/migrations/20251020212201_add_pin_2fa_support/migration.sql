-- AlterTable
ALTER TABLE "members" ADD COLUMN     "pin_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pin_hash" VARCHAR(255),
ADD COLUMN     "pin_locked_until" TIMESTAMP(6),
ADD COLUMN     "pin_set_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "two_factor_channel_pin_enabled" BOOLEAN DEFAULT false;
