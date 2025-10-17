-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "pwa_background_color" VARCHAR(7) DEFAULT '#ffffff',
ADD COLUMN     "pwa_icon_192_url" TEXT,
ADD COLUMN     "pwa_icon_512_url" TEXT,
ADD COLUMN     "pwa_name" VARCHAR(100),
ADD COLUMN     "pwa_short_name" VARCHAR(20),
ADD COLUMN     "pwa_theme_color" VARCHAR(7) DEFAULT '#0066cc';
