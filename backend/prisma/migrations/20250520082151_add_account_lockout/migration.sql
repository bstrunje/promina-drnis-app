-- AlterTable
ALTER TABLE "members" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_failed_login" TIMESTAMP(6),
ADD COLUMN     "locked_until" TIMESTAMP(6);
