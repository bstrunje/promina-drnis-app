/*
  Warnings:

  - You are about to drop the column `activity_type_id` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty_level` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `max_participants` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the `activity_participants` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizer_id` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type_id` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `activities` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `activities` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_activity_type_id_fkey";

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_created_by_fkey";

-- DropForeignKey
ALTER TABLE "activity_participants" DROP CONSTRAINT "activity_participants_activity_id_fkey";

-- DropForeignKey
ALTER TABLE "activity_participants" DROP CONSTRAINT "activity_participants_member_id_fkey";

-- DropIndex
DROP INDEX "idx_activities_type";

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "activity_type_id",
DROP COLUMN "created_by",
DROP COLUMN "difficulty_level",
DROP COLUMN "end_date",
DROP COLUMN "location",
DROP COLUMN "max_participants",
DROP COLUMN "title",
ADD COLUMN     "actual_end_time" TIMESTAMP(3),
ADD COLUMN     "actual_start_time" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "organizer_id" INTEGER NOT NULL,
ADD COLUMN     "recognition_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "status" "ActivityStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "type_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "activity_participants";

-- CreateTable
CREATE TABLE "activity_participations" (
    "participation_id" SERIAL NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "manual_hours" DOUBLE PRECISION,
    "recognition_override" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_participations_pkey" PRIMARY KEY ("participation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_participations_activity_id_member_id_key" ON "activity_participations"("activity_id", "member_id");

-- CreateIndex
CREATE INDEX "activities_type_id_idx" ON "activities"("type_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "activity_types"("type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("activity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;
