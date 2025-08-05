-- DropForeignKey
ALTER TABLE "public"."annual_statistics" DROP CONSTRAINT "annual_statistics_member_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_affected_member_fkey";

-- DropForeignKey
ALTER TABLE "public"."card_numbers" DROP CONSTRAINT "member_fk";

-- DropForeignKey
ALTER TABLE "public"."member_messages" DROP CONSTRAINT "member_messages_member_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."member_permissions" DROP CONSTRAINT "member_permissions_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."member_permissions" DROP CONSTRAINT "member_permissions_member_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."membership_details" DROP CONSTRAINT "membership_details_member_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."membership_periods" DROP CONSTRAINT "membership_periods_member_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."password_update_queue" DROP CONSTRAINT "password_update_queue_member_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_member_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."stamp_history" DROP CONSTRAINT "stamp_history_reset_by_fkey";

-- AlterTable
ALTER TABLE "public"."members" ADD COLUMN     "buff_delivered" BOOLEAN DEFAULT false,
ADD COLUMN     "buff_size" VARCHAR(4),
ADD COLUMN     "shell_jacket_delivered" BOOLEAN DEFAULT false,
ADD COLUMN     "tshirt_delivered" BOOLEAN DEFAULT false;

-- AddForeignKey
ALTER TABLE "public"."membership_details" ADD CONSTRAINT "membership_details_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."membership_periods" ADD CONSTRAINT "membership_periods_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_messages" ADD CONSTRAINT "member_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."annual_statistics" ADD CONSTRAINT "annual_statistics_member_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_affected_member_fkey" FOREIGN KEY ("affected_member") REFERENCES "public"."members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_permissions" ADD CONSTRAINT "member_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_permissions" ADD CONSTRAINT "member_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_numbers" ADD CONSTRAINT "member_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_update_queue" ADD CONSTRAINT "password_update_queue_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stamp_history" ADD CONSTRAINT "stamp_history_reset_by_fkey" FOREIGN KEY ("reset_by") REFERENCES "public"."members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;
