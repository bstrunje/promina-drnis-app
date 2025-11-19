-- CreateIndex
CREATE INDEX "idx_activities_org_date" ON "activities"("organization_id", "start_date");

-- CreateIndex
CREATE INDEX "idx_activities_org_status" ON "activities"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_activities_org_type" ON "activities"("organization_id", "type_id");

-- CreateIndex
CREATE INDEX "idx_participations_org_member" ON "activity_participations"("organization_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_participations_org_activity" ON "activity_participations"("organization_id", "activity_id");

-- CreateIndex
CREATE INDEX "idx_activity_types_org_visible" ON "activity_types"("organization_id", "is_visible");

-- CreateIndex
CREATE INDEX "idx_annual_stats_org_year" ON "annual_statistics"("organization_id", "year");

-- CreateIndex
CREATE INDEX "idx_annual_stats_org_member" ON "annual_statistics"("organization_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_org_created" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_org_action" ON "audit_logs"("organization_id", "action_type");

-- CreateIndex
CREATE INDEX "idx_audit_logs_org_performer" ON "audit_logs"("organization_id", "performed_by");

-- CreateIndex
CREATE INDEX "idx_card_numbers_org_status" ON "card_numbers"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_card_numbers_org_member" ON "card_numbers"("organization_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_consumed_cards_org_member" ON "consumed_card_numbers"("organization_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_consumed_cards_org_date" ON "consumed_card_numbers"("organization_id", "consumed_at");

-- CreateIndex
CREATE INDEX "idx_equipment_org_type" ON "equipment_inventory"("organization_id", "equipment_type");

-- CreateIndex
CREATE INDEX "idx_holidays_org_recurring" ON "holidays"("organization_id", "is_recurring");

-- CreateIndex
CREATE INDEX "idx_messages_org_created" ON "member_messages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_messages_org_sender" ON "member_messages"("organization_id", "sender_id");

-- CreateIndex
CREATE INDEX "idx_messages_org_recipient" ON "member_messages"("organization_id", "recipient_id");

-- CreateIndex
CREATE INDEX "idx_members_org_fullname" ON "members"("organization_id", "full_name");

-- CreateIndex
CREATE INDEX "idx_members_org_hours" ON "members"("organization_id", "total_hours");

-- CreateIndex
CREATE INDEX "idx_members_org_created" ON "members"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_members_org_status" ON "members"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_members_org_role" ON "members"("organization_id", "role");

-- CreateIndex
CREATE INDEX "idx_membership_periods_org_member" ON "membership_periods"("organization_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_membership_periods_org_start" ON "membership_periods"("organization_id", "start_date");

-- CreateIndex
CREATE INDEX "idx_stamp_history_org_date" ON "stamp_history"("organization_id", "reset_date");

-- CreateIndex
CREATE INDEX "idx_stamp_inventory_org_year" ON "stamp_inventory"("organization_id", "stamp_year");

-- CreateIndex
CREATE INDEX "idx_support_tickets_org_status" ON "support_tickets"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_support_tickets_org_category" ON "support_tickets"("organization_id", "category");

-- CreateIndex
CREATE INDEX "idx_support_tickets_org_created" ON "support_tickets"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_system_manager_org_login" ON "system_manager"("organization_id", "last_login");
