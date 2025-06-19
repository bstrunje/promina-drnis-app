/*
  Warnings:

  - You are about to drop the `ConsumedCardNumber` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConsumedCardNumber" DROP CONSTRAINT "ConsumedCardNumber_member_id_fkey";

-- DropTable
DROP TABLE "ConsumedCardNumber";

-- CreateTable
CREATE TABLE "consumed_card_numbers" (
    "id" SERIAL NOT NULL,
    "card_number" TEXT NOT NULL,
    "member_id" INTEGER NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumed_card_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consumed_card_numbers_card_number_key" ON "consumed_card_numbers"("card_number");

-- AddForeignKey
ALTER TABLE "consumed_card_numbers" ADD CONSTRAINT "consumed_card_numbers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
