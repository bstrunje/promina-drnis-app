-- CreateTable
CREATE TABLE "ConsumedCardNumber" (
    "id" SERIAL NOT NULL,
    "card_number" TEXT NOT NULL,
    "member_id" INTEGER NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumedCardNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsumedCardNumber_card_number_key" ON "ConsumedCardNumber"("card_number");

-- AddForeignKey
ALTER TABLE "ConsumedCardNumber" ADD CONSTRAINT "ConsumedCardNumber_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
