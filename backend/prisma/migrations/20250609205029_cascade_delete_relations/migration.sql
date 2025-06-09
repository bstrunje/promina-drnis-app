-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_affected_member_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_performed_by_fkey";

-- DropForeignKey
ALTER TABLE "card_numbers" DROP CONSTRAINT "member_fk";

-- DropForeignKey
ALTER TABLE "member_messages" DROP CONSTRAINT "member_messages_member_id_fkey";

-- DropForeignKey
ALTER TABLE "member_messages" DROP CONSTRAINT "member_messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "member_permissions" DROP CONSTRAINT "member_permissions_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "member_permissions" DROP CONSTRAINT "member_permissions_member_id_fkey";

-- DropForeignKey
ALTER TABLE "password_update_queue" DROP CONSTRAINT "password_update_queue_member_id_fkey";

-- DropForeignKey
ALTER TABLE "stamp_history" DROP CONSTRAINT "stamp_history_reset_by_fkey";

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_affected_member_fkey" FOREIGN KEY ("affected_member") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "card_numbers" ADD CONSTRAINT "member_fk" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_update_queue" ADD CONSTRAINT "password_update_queue_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stamp_history" ADD CONSTRAINT "stamp_history_reset_by_fkey" FOREIGN KEY ("reset_by") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;
