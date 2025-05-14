-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('member', 'admin', 'superuser');

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

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "activity_types" (
    "type_id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("type_id")
);

-- CreateTable
CREATE TABLE "activities" (
    "activity_id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6) NOT NULL,
    "location" VARCHAR(100),
    "difficulty_level" VARCHAR(20),
    "max_participants" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "activity_type_id" INTEGER,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "activity_participants" (
    "participation_id" SERIAL NOT NULL,
    "activity_id" INTEGER,
    "member_id" INTEGER,
    "hours_spent" DECIMAL(5,2) NOT NULL,
    "role" VARCHAR(50),
    "notes" TEXT,
    "verified_by" INTEGER,
    "verified_at" TIMESTAMP(6),
    "verified_by_member_id" INTEGER,

    CONSTRAINT "activity_participants_pkey" PRIMARY KEY ("participation_id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "card_number_length" INTEGER DEFAULT 5,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewal_start_day" INTEGER DEFAULT 1,
    "updated_by" VARCHAR(255) NOT NULL DEFAULT 'system',
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
CREATE TABLE "member_messages" (
    "message_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "message_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'unread',
    "sender_id" INTEGER,
    "recipient_id" INTEGER,
    "recipient_type" VARCHAR(10) DEFAULT 'admin',
    "sender_type" "SenderType" NOT NULL DEFAULT 'member',

    CONSTRAINT "member_messages_pkey" PRIMARY KEY ("message_id")
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
    "action_details" TEXT NOT NULL,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20),
    "affected_member" INTEGER,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "Hours" (
    "id" SERIAL NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "hours" INTEGER NOT NULL,
    "verified" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "permission_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "can_manage_end_reasons" BOOLEAN DEFAULT false,
    "granted_by" INTEGER,
    "granted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("permission_id")
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
CREATE TABLE "members_backup" (
    "id" INTEGER,
    "name" VARCHAR(255),
    "status" VARCHAR(50),
    "date_of_birth" DATE,
    "oib" VARCHAR(13),
    "cell_phone" VARCHAR(20),
    "city" VARCHAR(100),
    "street_address" VARCHAR(200),
    "email" VARCHAR(255),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "member_id" VARCHAR(1000)
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
CREATE TABLE "system_admin" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "system_admin_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "activity_types_name_key" ON "activity_types"("name");

-- CreateIndex
CREATE INDEX "idx_activities_date" ON "activities"("start_date");

-- CreateIndex
CREATE INDEX "idx_activities_type" ON "activities"("activity_type_id");

-- CreateIndex
CREATE INDEX "idx_activities_start_date" ON "activities"("start_date");

-- CreateIndex
CREATE INDEX "idx_activity_participants_activity" ON "activity_participants"("activity_id");

-- CreateIndex
CREATE INDEX "idx_activity_participants_hours" ON "activity_participants"("hours_spent");

-- CreateIndex
CREATE INDEX "idx_activity_participants_member" ON "activity_participants"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_details_card_number_key" ON "membership_details"("card_number");

-- CreateIndex
CREATE INDEX "idx_membership_periods_test_data" ON "membership_periods"("is_test_data");

-- CreateIndex
CREATE UNIQUE INDEX "stamp_type_year_unique" ON "stamp_inventory"("stamp_type", "stamp_year");

-- CreateIndex
CREATE INDEX "idx_annual_statistics_member_year" ON "annual_statistics"("member_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "unique_member_year" ON "annual_statistics"("member_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_username_key" ON "system_admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_email_key" ON "system_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_member_id_key" ON "admin_permissions"("member_id");

-- CreateIndex
CREATE INDEX "idx_admin_permissions_granted_by" ON "admin_permissions"("granted_by");

-- CreateIndex
CREATE INDEX "idx_admin_permissions_member" ON "admin_permissions"("member_id");

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
CREATE UNIQUE INDEX "system_admin_username_key" ON "system_admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_email_key" ON "system_admin"("email");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "activity_types"("type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_participants" ADD CONSTRAINT "activity_participants_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("activity_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membership_details" ADD CONSTRAINT "membership_details_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "annual_statistics" ADD CONSTRAINT "annual_statistics_member_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_affected_member_fkey" FOREIGN KEY ("affected_member") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "members"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "card_numbers" ADD CONSTRAINT "member_fk" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_update_queue" ADD CONSTRAINT "password_update_queue_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stamp_history" ADD CONSTRAINT "stamp_history_reset_by_fkey" FOREIGN KEY ("reset_by") REFERENCES "members"("member_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE NO ACTION;
