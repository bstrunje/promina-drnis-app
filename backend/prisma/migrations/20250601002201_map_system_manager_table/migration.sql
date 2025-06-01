/*
  Warnings:

  - You are about to drop the `SystemManager` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SystemManager";

-- CreateTable
CREATE TABLE "system_manager" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "system_manager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_manager_username_key" ON "system_manager"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_manager_email_key" ON "system_manager"("email");
