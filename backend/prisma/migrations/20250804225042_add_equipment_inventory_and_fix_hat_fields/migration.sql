/*
  Warnings:

  - You are about to drop the column `buff_delivered` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `buff_size` on the `members` table. All the data in the column will be lost.
  - Made the column `shell_jacket_delivered` on table `members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tshirt_delivered` on table `members` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."members" DROP COLUMN "buff_delivered",
DROP COLUMN "buff_size",
ADD COLUMN     "hat_delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hat_size" VARCHAR(4),
ALTER COLUMN "shell_jacket_delivered" SET NOT NULL,
ALTER COLUMN "tshirt_delivered" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."equipment_inventory" (
    "id" SERIAL NOT NULL,
    "equipment_type" VARCHAR(20) NOT NULL,
    "size" VARCHAR(4) NOT NULL,
    "gender" VARCHAR(6) NOT NULL,
    "initial_count" INTEGER NOT NULL DEFAULT 0,
    "issued_count" INTEGER NOT NULL DEFAULT 0,
    "gift_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_inventory_equipment_type_size_gender_key" ON "public"."equipment_inventory"("equipment_type", "size", "gender");
