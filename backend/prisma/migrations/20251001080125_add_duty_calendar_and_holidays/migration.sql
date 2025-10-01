-- AlterTable
ALTER TABLE "public"."system_settings" ADD COLUMN     "duty_auto_create_enabled" BOOLEAN DEFAULT true,
ADD COLUMN     "duty_calendar_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "duty_max_participants" INTEGER DEFAULT 2;

-- CreateTable
CREATE TABLE "public"."holidays" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "public"."holidays"("date");
