/*
  Warnings:

  - You are about to alter the column `key` on the `activity_types` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - The primary key for the `system_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `system_settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[organization_id,key]` on the table `activity_types` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,card_number]` on the table `card_numbers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,card_number]` on the table `consumed_card_numbers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,equipment_type,size,gender]` on the table `equipment_inventory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,date]` on the table `holidays` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,username]` on the table `member_administrator` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,email]` on the table `member_administrator` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,oib]` on the table `members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,key]` on the table `skills` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,stamp_type,stamp_year]` on the table `stamp_inventory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,username]` on the table `system_manager` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,email]` on the table `system_manager` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id]` on the table `system_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."activity_types_key_key";

-- DropIndex
DROP INDEX "public"."card_number_unique";

-- DropIndex
DROP INDEX "public"."consumed_card_numbers_card_number_key";

-- DropIndex
DROP INDEX "public"."equipment_inventory_equipment_type_size_gender_key";

-- DropIndex
DROP INDEX "public"."holidays_date_key";

-- DropIndex
DROP INDEX "public"."member_administrator_email_key";

-- DropIndex
DROP INDEX "public"."member_administrator_username_key";

-- DropIndex
DROP INDEX "public"."skills_key_key";

-- DropIndex
DROP INDEX "public"."skills_name_key";

-- DropIndex
DROP INDEX "public"."stamp_type_year_unique";

-- DropIndex
DROP INDEX "public"."system_manager_email_key";

-- DropIndex
DROP INDEX "public"."system_manager_username_key";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "activity_participations" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "activity_types" ADD COLUMN     "organization_id" INTEGER,
ALTER COLUMN "key" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "annual_statistics" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "card_numbers" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "consumed_card_numbers" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "equipment_inventory" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "holidays" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "member_administrator" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "member_messages" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "membership_periods" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "stamp_history" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "stamp_inventory" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "system_manager" ADD COLUMN     "organization_id" INTEGER;

-- AlterTable
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_pkey",
ADD COLUMN     "organization_id" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(50),
    "subdomain" VARCHAR(50) NOT NULL,
    "logo_path" VARCHAR(255),
    "primary_color" VARCHAR(7) DEFAULT '#3b82f6',
    "secondary_color" VARCHAR(7) DEFAULT '#1e40af',
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "website_url" VARCHAR(255),
    "ethics_code_url" VARCHAR(500),
    "privacy_policy_url" VARCHAR(500),
    "membership_rules_url" VARCHAR(500),
    "street_address" VARCHAR(200),
    "city" VARCHAR(100),
    "postal_code" VARCHAR(10),
    "country" VARCHAR(50) DEFAULT 'Hrvatska',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_subdomain_key" ON "organizations"("subdomain");

-- CreateIndex
CREATE INDEX "organizations_subdomain_idx" ON "organizations"("subdomain");

-- CreateIndex
CREATE INDEX "organizations_is_active_idx" ON "organizations"("is_active");

-- CreateIndex
CREATE INDEX "activities_organization_id_idx" ON "activities"("organization_id");

-- CreateIndex
CREATE INDEX "activity_participations_organization_id_idx" ON "activity_participations"("organization_id");

-- CreateIndex
CREATE INDEX "activity_participations_member_id_idx" ON "activity_participations"("member_id");

-- CreateIndex
CREATE INDEX "activity_types_organization_id_idx" ON "activity_types"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_types_organization_id_key_key" ON "activity_types"("organization_id", "key");

-- CreateIndex
CREATE INDEX "annual_statistics_organization_id_idx" ON "annual_statistics"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "card_numbers_organization_id_idx" ON "card_numbers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_number_unique" ON "card_numbers"("organization_id", "card_number");

-- CreateIndex
CREATE INDEX "consumed_card_numbers_organization_id_idx" ON "consumed_card_numbers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "consumed_card_numbers_organization_id_card_number_key" ON "consumed_card_numbers"("organization_id", "card_number");

-- CreateIndex
CREATE INDEX "equipment_inventory_organization_id_idx" ON "equipment_inventory"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_inventory_organization_id_equipment_type_size_gen_key" ON "equipment_inventory"("organization_id", "equipment_type", "size", "gender");

-- CreateIndex
CREATE INDEX "holidays_organization_id_idx" ON "holidays"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_organization_id_date_key" ON "holidays"("organization_id", "date");

-- CreateIndex
CREATE INDEX "member_administrator_organization_id_idx" ON "member_administrator"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_administrator_organization_id_username_key" ON "member_administrator"("organization_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "member_administrator_organization_id_email_key" ON "member_administrator"("organization_id", "email");

-- CreateIndex
CREATE INDEX "member_messages_organization_id_idx" ON "member_messages"("organization_id");

-- CreateIndex
CREATE INDEX "members_organization_id_idx" ON "members"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_organization_id_oib_key" ON "members"("organization_id", "oib");

-- CreateIndex
CREATE INDEX "membership_periods_organization_id_idx" ON "membership_periods"("organization_id");

-- CreateIndex
CREATE INDEX "skills_organization_id_idx" ON "skills"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_organization_id_key_key" ON "skills"("organization_id", "key");

-- CreateIndex
CREATE INDEX "stamp_history_organization_id_idx" ON "stamp_history"("organization_id");

-- CreateIndex
CREATE INDEX "stamp_history_organization_id_stamp_year_idx" ON "stamp_history"("organization_id", "stamp_year");

-- CreateIndex
CREATE INDEX "stamp_inventory_organization_id_idx" ON "stamp_inventory"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "stamp_inventory_organization_id_stamp_type_stamp_year_key" ON "stamp_inventory"("organization_id", "stamp_type", "stamp_year");

-- CreateIndex
CREATE INDEX "system_manager_organization_id_idx" ON "system_manager"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_manager_organization_id_username_key" ON "system_manager"("organization_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "system_manager_organization_id_email_key" ON "system_manager"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_organization_id_key" ON "system_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_types" ADD CONSTRAINT "activity_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_inventory" ADD CONSTRAINT "stamp_inventory_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_inventory" ADD CONSTRAINT "equipment_inventory_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumed_card_numbers" ADD CONSTRAINT "consumed_card_numbers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_statistics" ADD CONSTRAINT "annual_statistics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_administrator" ADD CONSTRAINT "member_administrator_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_numbers" ADD CONSTRAINT "card_numbers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_history" ADD CONSTRAINT "stamp_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_manager" ADD CONSTRAINT "system_manager_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
