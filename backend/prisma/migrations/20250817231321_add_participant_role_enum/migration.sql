-- CreateEnum
CREATE TYPE "public"."participant_roles" AS ENUM ('GUIDE', 'ASSISTANT_GUIDE', 'DRIVER', 'REGULAR');

-- AlterTable
ALTER TABLE "public"."activity_participations" ADD COLUMN     "participant_role" "public"."participant_roles";
