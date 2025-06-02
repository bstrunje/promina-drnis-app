-- CreateIndex
CREATE INDEX "idx_membership_details_fee_payment_year" ON "membership_details"("fee_payment_year");

-- CreateIndex
CREATE INDEX "idx_membership_details_fee_payment_date" ON "membership_details"("fee_payment_date");

-- CreateIndex
CREATE INDEX "idx_membership_details_card_stamp_issued" ON "membership_details"("card_stamp_issued");

-- CreateIndex
CREATE INDEX "idx_membership_details_next_year_stamp_issued" ON "membership_details"("next_year_stamp_issued");
