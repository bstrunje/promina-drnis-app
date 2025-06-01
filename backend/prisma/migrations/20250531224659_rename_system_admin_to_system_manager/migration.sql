/*
  Warnings:

  - You are about to drop the `system_admin` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "system_admin";

-- CreateTable
CREATE TABLE "SystemManager" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "SystemManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemManager_username_key" ON "SystemManager"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SystemManager_email_key" ON "SystemManager"("email");
