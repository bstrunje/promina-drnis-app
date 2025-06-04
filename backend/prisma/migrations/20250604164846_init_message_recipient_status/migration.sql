/*
  Warnings:

  - You are about to drop the column `read_at` on the `member_messages` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `member_messages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "member_messages" DROP CONSTRAINT "member_messages_member_id_fkey";

-- AlterTable
ALTER TABLE "member_messages" DROP COLUMN "read_at",
DROP COLUMN "status";

-- CreateTable
CREATE TABLE "message_recipient_status" (
    "message_recipient_status_id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "recipient_member_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'unread',
    "read_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "message_recipient_status_pkey" PRIMARY KEY ("message_recipient_status_id")
);

-- CreateIndex
CREATE INDEX "message_recipient_status_message_id_idx" ON "message_recipient_status"("message_id");

-- CreateIndex
CREATE INDEX "message_recipient_status_recipient_member_id_idx" ON "message_recipient_status"("recipient_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_recipient_status_message_id_recipient_member_id_key" ON "message_recipient_status"("message_id", "recipient_member_id");

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipient_status" ADD CONSTRAINT "message_recipient_status_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "member_messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipient_status" ADD CONSTRAINT "message_recipient_status_recipient_member_id_fkey" FOREIGN KEY ("recipient_member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;
