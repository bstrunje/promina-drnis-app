-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "password_card_digits" INTEGER DEFAULT 4,
ADD COLUMN     "password_separator" TEXT DEFAULT '-isk-';
