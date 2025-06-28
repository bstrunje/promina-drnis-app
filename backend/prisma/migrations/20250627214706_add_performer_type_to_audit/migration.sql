-- CreateEnum
CREATE TYPE "PerformerType" AS ENUM ('MEMBER', 'SYSTEM_MANAGER');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "performer_type" "PerformerType";
