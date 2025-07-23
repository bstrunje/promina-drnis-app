-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('member', 'member_administrator', 'member_superuser');

-- CreateEnum
CREATE TYPE "PerformerType" AS ENUM ('MEMBER', 'SYSTEM_MANAGER');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "members" (
    "status" VARCHAR(50) DEFAULT 'pending',
    "date_of_birth" DATE,
    "oib" VARCHAR(11) NOT NULL,
    "cell_phone" VARCHAR(20) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "street_address" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "member_id" SERIAL NOT NULL,
    "password_hash" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "last_login" TIMESTAMP(6),
    "full_name" VARCHAR(100) NOT NULL,
    "life_status" VARCHAR(25),
    "tshirt_size" VARCHAR(4),
    "shell_jacket_size" VARCHAR(4),
    "total_hours" DECIMAL(10,2) DEFAULT 0,
    "gender" VARCHAR(6),
    "registration_completed" BOOLEAN DEFAULT false,
    "profile_image_path" VARCHAR(255),
    "profile_image_updated_at" TIMESTAMP(6),
    "membership_type" VARCHAR(20) DEFAULT 'regular',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "nickname" VARCHAR(50),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_login" TIMESTAMP(6),
    "locked_until" TIMESTAMP(6),
    "other_skills" VARCHAR(500),

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "activity_types" (
    "type_id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("type_id")
);

-- CreateTable
CREATE TABLE "activities" (
    "activity_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "start_date" TIMESTAMP(3) NOT NULL,
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "recognition_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "activity_participations" (
    "participation_id" SERIAL NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "manual_hours" DOUBLE PRECISION,
    "recognition_override" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_participations_pkey" PRIMARY KEY ("participation_id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_instructor_possible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_skills" (
    "member_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "is_instructor" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_skills_pkey" PRIMARY KEY ("member_id","skill_id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "card_number_length" INTEGER DEFAULT 5,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewal_start_day" INTEGER DEFAULT 1,
    "updated_by" INTEGER,
    "renewal_start_month" INTEGER DEFAULT 11,
    "time_zone" TEXT DEFAULT 'Europe/Zagreb',

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_details" (
    "member_id" INTEGER NOT NULL,
    "card_number" VARCHAR(50),
    "fee_payment_year" INTEGER,
    "card_stamp_issued" BOOLEAN DEFAULT false,
    "fee_payment_date" TIMESTAMP(6),
    "next_year_stamp_issued" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'active',
    "active_until" TIMESTAMP(6),

    CONSTRAINT "membership_details_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "membership_periods" (
    "period_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6),
    "end_reason" VARCHAR(20),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_test_data" BOOLEAN DEFAULT false,

    CONSTRAINT "membership_periods_pkey" PRIMARY KEY ("period_id")
);

-- CreateTable
CREATE TABLE "stamp_inventory" (
    "id" SERIAL NOT NULL,
    "stamp_type" VARCHAR(20) NOT NULL,
    "initial_count" INTEGER NOT NULL DEFAULT 0,
    "issued_count" INTEGER DEFAULT 0,
    "remaining" INTEGER,
    "last_updated" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "stamp_year" INTEGER,

    CONSTRAINT "stamp_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumed_card_numbers" (
    "id" SERIAL NOT NULL,
    "card_number" TEXT NOT NULL,
    "member_id" INTEGER NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumed_card_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_messages" (
    "message_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "message_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "sender_id" INTEGER,
    "recipient_id" INTEGER,
    "recipient_type" VARCHAR(20) DEFAULT 'member_administrator',
    "sender_type" "SenderType" NOT NULL DEFAULT 'member',

    CONSTRAINT "member_messages_pkey" PRIMARY KEY ("message_id")
);

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

-- CreateTable
CREATE TABLE "annual_statistics" (
    "stat_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "year" INTEGER NOT NULL,
    "total_hours" DECIMAL(7,2) NOT NULL,
    "total_activities" INTEGER NOT NULL,
    "membership_status" VARCHAR(20) NOT NULL,
    "calculated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_statistics_pkey" PRIMARY KEY ("stat_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" SERIAL NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "performed_by" INTEGER,
    "performer_type" "PerformerType",
    "action_details" TEXT NOT NULL,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20),
    "affected_member" INTEGER,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "member_administrator" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "member_administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_permissions" (
    "permission_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "can_manage_end_reasons" BOOLEAN DEFAULT false,
    "granted_by" INTEGER,
    "granted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "can_add_members" BOOLEAN DEFAULT false,
    "can_approve_activities" BOOLEAN DEFAULT false,
    "can_assign_passwords" BOOLEAN DEFAULT false,
    "can_create_activities" BOOLEAN DEFAULT false,
    "can_edit_members" BOOLEAN DEFAULT false,
    "can_export_data" BOOLEAN DEFAULT false,
    "can_manage_all_messages" BOOLEAN DEFAULT false,
    "can_manage_card_numbers" BOOLEAN DEFAULT false,
    "can_manage_financials" BOOLEAN DEFAULT false,
    "can_manage_membership" BOOLEAN DEFAULT false,
    "can_send_group_messages" BOOLEAN DEFAULT false,
    "can_view_activities" BOOLEAN DEFAULT false,
    "can_view_financials" BOOLEAN DEFAULT false,
    "can_view_members" BOOLEAN DEFAULT false,
    "can_view_statistics" BOOLEAN DEFAULT false,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "card_numbers" (
    "id" SERIAL NOT NULL,
    "card_number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" TIMESTAMPTZ(6),
    "member_id" INTEGER,

    CONSTRAINT "card_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_update_queue" (
    "queue_id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "card_number" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN DEFAULT false,

    CONSTRAINT "password_update_queue_pkey" PRIMARY KEY ("queue_id")
);

-- CreateTable
CREATE TABLE "stamp_history" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "stamp_type" VARCHAR(50) NOT NULL,
    "initial_count" INTEGER NOT NULL,
    "issued_count" INTEGER NOT NULL,
    "reset_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reset_by" INTEGER,
    "notes" TEXT,
    "stamp_year" INTEGER NOT NULL,

    CONSTRAINT "stamp_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "member_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "members_oib_key" ON "members"("oib");

-- CreateIndex
CREATE INDEX "idx_members_full_name" ON "members"("full_name");

-- CreateIndex
CREATE INDEX "idx_members_oib" ON "members"("oib");

-- CreateIndex
CREATE INDEX "idx_members_total_hours" ON "members"("total_hours");

-- CreateIndex
CREATE UNIQUE INDEX "activity_types_key_key" ON "activity_types"("key");

-- CreateIndex
CREATE INDEX "activities_type_id_idx" ON "activities"("type_id");

-- CreateIndex
CREATE INDEX "activities_start_date_idx" ON "activities"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "activity_participations_activity_id_member_id_key" ON "activity_participations"("activity_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_key_key" ON "skills"("key");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "membership_details_card_number_key" ON "membership_details"("card_number");

-- CreateIndex
CREATE INDEX "idx_membership_details_fee_payment_year" ON "membership_details"("fee_payment_year");

-- CreateIndex
CREATE INDEX "idx_membership_details_fee_payment_date" ON "membership_details"("fee_payment_date");

-- CreateIndex
CREATE INDEX "idx_membership_details_card_stamp_issued" ON "membership_details"("card_stamp_issued");

-- CreateIndex
CREATE INDEX "idx_membership_details_next_year_stamp_issued" ON "membership_details"("next_year_stamp_issued");

-- CreateIndex
CREATE INDEX "idx_membership_periods_test_data" ON "membership_periods"("is_test_data");

-- CreateIndex
CREATE UNIQUE INDEX "stamp_type_year_unique" ON "stamp_inventory"("stamp_type", "stamp_year");

-- CreateIndex
CREATE UNIQUE INDEX "consumed_card_numbers_card_number_key" ON "consumed_card_numbers"("card_number");

-- CreateIndex
CREATE INDEX "message_recipient_status_message_id_idx" ON "message_recipient_status"("message_id");

-- CreateIndex
CREATE INDEX "message_recipient_status_recipient_member_id_idx" ON "message_recipient_status"("recipient_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_recipient_status_message_id_recipient_member_id_key" ON "message_recipient_status"("message_id", "recipient_member_id");

-- CreateIndex
CREATE INDEX "idx_annual_statistics_member_year" ON "annual_statistics"("member_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "unique_member_year" ON "annual_statistics"("member_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "member_administrator_username_key" ON "member_administrator"("username");

-- CreateIndex
CREATE UNIQUE INDEX "member_administrator_email_key" ON "member_administrator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "member_permissions_member_id_key" ON "member_permissions"("member_id");

-- CreateIndex
CREATE INDEX "idx_member_permissions_granted_by" ON "member_permissions"("granted_by");

-- CreateIndex
CREATE INDEX "idx_member_permissions_member" ON "member_permissions"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_number_unique" ON "card_numbers"("card_number");

-- CreateIndex
CREATE INDEX "idx_card_numbers_member_id" ON "card_numbers"("member_id");

-- CreateIndex
CREATE INDEX "idx_card_numbers_status" ON "card_numbers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_member_id" ON "refresh_tokens"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_manager_username_key" ON "system_manager"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_manager_email_key" ON "system_manager"("email");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "activity_types"("type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("activity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_details" ADD CONSTRAINT "membership_details_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumed_card_numbers" ADD CONSTRAINT "consumed_card_numbers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipient_status" ADD CONSTRAINT "message_recipient_status_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "member_messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipient_status" ADD CONSTRAINT "message_recipient_status_recipient_member_id_fkey" FOREIGN KEY ("recipient_member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_statistics" ADD CONSTRAINT "annual_statistics_member_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_affected_member_fkey" FOREIGN KEY ("affected_member") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

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

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;
