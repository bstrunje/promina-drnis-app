/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `activity_types` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `activity_types` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "activity_types_name_key";

-- Step 1: Add the 'key' column, but allow it to be NULL initially
ALTER TABLE "activity_types" ADD COLUMN "key" TEXT;

-- Step 2: Populate the new 'key' column for existing rows.
-- We'll generate a key from the existing 'name' field (e.g., "Javne akcije" -> "javne-akcije")
UPDATE "activity_types" SET "key" = lower(regexp_replace("name", E'\s+', '-', 'g'));

-- Step 3: Now that all rows have a key, make the column non-nullable
ALTER TABLE "activity_types" ALTER COLUMN "key" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "activity_types_key_key" ON "activity_types"("key");
