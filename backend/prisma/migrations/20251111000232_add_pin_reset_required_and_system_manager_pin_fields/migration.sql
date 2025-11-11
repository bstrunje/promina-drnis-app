-- AlterTable
ALTER TABLE "members" ADD COLUMN     "pin_reset_required" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "system_manager" ADD COLUMN     "pin_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pin_hash" VARCHAR(255),
ADD COLUMN     "pin_locked_until" TIMESTAMP(6),
ADD COLUMN     "pin_reset_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pin_set_at" TIMESTAMP(6);
