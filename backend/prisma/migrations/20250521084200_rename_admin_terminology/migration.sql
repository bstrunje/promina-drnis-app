/*
  Warnings:

  - The values [admin,superuser] on the enum `SenderType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `admin_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_admins` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SenderType_new" AS ENUM ('member', 'member_administrator', 'member_superuser');
ALTER TABLE "member_messages" ALTER COLUMN "sender_type" DROP DEFAULT;
ALTER TABLE "member_messages" ALTER COLUMN "sender_type" TYPE "SenderType_new" USING ("sender_type"::text::"SenderType_new");
ALTER TYPE "SenderType" RENAME TO "SenderType_old";
ALTER TYPE "SenderType_new" RENAME TO "SenderType";
DROP TYPE "SenderType_old";
ALTER TABLE "member_messages" ALTER COLUMN "sender_type" SET DEFAULT 'member';
COMMIT;

-- DropForeignKey
ALTER TABLE "admin_permissions" DROP CONSTRAINT "admin_permissions_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "admin_permissions" DROP CONSTRAINT "admin_permissions_member_id_fkey";

-- AlterTable
ALTER TABLE "member_messages" ALTER COLUMN "recipient_type" SET DEFAULT 'member_administrator';

-- DropTable
DROP TABLE "admin_permissions";

-- DropTable
DROP TABLE "system_admins";

-- CreateTable
CREATE TABLE "member_administrator" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "member_administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_permissions" (
    "permission_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "can_manage_end_reasons" BOOLEAN DEFAULT false,
    "granted_by" INTEGER,
    "granted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_administrator_username_key" ON "member_administrator"("username");

-- CreateIndex
CREATE UNIQUE INDEX "member_administrator_email_key" ON "member_administrator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "member_permissions_member_id_key" ON "member_permissions"("member_id");

-- CreateIndex
CREATE INDEX "idx_member_permissions_granted_by" ON "member_permissions"("granted_by");

-- CreateIndex
CREATE INDEX "idx_member_permissions_member" ON "member_permissions"("member_id");

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "members"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
