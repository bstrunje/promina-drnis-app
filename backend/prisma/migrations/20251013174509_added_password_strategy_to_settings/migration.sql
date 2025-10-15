-- CreateEnum
CREATE TYPE "PasswordGenerationStrategy" AS ENUM ('FULLNAME_ISK_CARD', 'RANDOM_8', 'EMAIL_PREFIX_CARD_SUFFIX');

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "password_generation_strategy" "PasswordGenerationStrategy" DEFAULT 'FULLNAME_ISK_CARD';
