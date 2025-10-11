-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "backup_frequency" TEXT DEFAULT 'daily',
ADD COLUMN     "backup_retention_days" INTEGER DEFAULT 7,
ADD COLUMN     "backup_storage_location" TEXT DEFAULT 'local',
ADD COLUMN     "last_backup_at" TIMESTAMP(6),
ADD COLUMN     "next_backup_at" TIMESTAMP(6);
