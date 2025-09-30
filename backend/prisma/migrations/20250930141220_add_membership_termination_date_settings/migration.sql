-- AlterTable
ALTER TABLE "public"."system_settings" ADD COLUMN     "membership_termination_day" INTEGER DEFAULT 1,
ADD COLUMN     "membership_termination_month" INTEGER DEFAULT 3;
