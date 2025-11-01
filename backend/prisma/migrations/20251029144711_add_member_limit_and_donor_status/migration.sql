-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "is_donor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "member_limit" INTEGER;
