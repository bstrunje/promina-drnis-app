-- DropForeignKey
ALTER TABLE "public"."consumed_card_numbers" DROP CONSTRAINT "consumed_card_numbers_member_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."consumed_card_numbers" ADD CONSTRAINT "consumed_card_numbers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;
