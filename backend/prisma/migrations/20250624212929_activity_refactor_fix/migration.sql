/*
  Warnings:

  - You are about to drop the column `verified_by_member_id` on the `activity_participants` table. All the data in the column will be lost.
  - You are about to drop the `Hours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `members_backup` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[activity_id,member_id]` on the table `activity_participants` will be added. If there are existing duplicate values, this will fail.
  - Made the column `created_by` on table `activities` required. This step will fail if there are existing NULL values in that column.
  - Made the column `activity_type_id` on table `activities` required. This step will fail if there are existing NULL values in that column.
  - Made the column `activity_id` on table `activity_participants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `member_id` on table `activity_participants` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_activity_type_id_fkey";

-- DropForeignKey
ALTER TABLE "activity_participants" DROP CONSTRAINT "activity_participants_activity_id_fkey";

-- AlterTable
ALTER TABLE "activities" ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "activity_type_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "activity_participants" DROP COLUMN "verified_by_member_id",
ALTER COLUMN "activity_id" SET NOT NULL,
ALTER COLUMN "member_id" SET NOT NULL;

-- DropTable
DROP TABLE "Hours";

-- DropTable
DROP TABLE "members_backup";

-- CreateIndex
CREATE UNIQUE INDEX "activity_participants_activity_id_member_id_key" ON "activity_participants"("activity_id", "member_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "activity_types"("type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participants" ADD CONSTRAINT "activity_participants_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("activity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participants" ADD CONSTRAINT "activity_participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;
