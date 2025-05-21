-- AlterTable
ALTER TABLE "member_messages" ALTER COLUMN "recipient_type" SET DATA TYPE VARCHAR(20);

-- Migracija postojećih podataka na nove nazive uloga

-- Ažuriranje uloga članova
UPDATE "members" SET "role" = 'member_administrator' WHERE "role" = 'admin';
UPDATE "members" SET "role" = 'member_superuser' WHERE "role" = 'superuser';

-- Ažuriranje recipient_type u porukama
UPDATE "member_messages" SET "recipient_type" = 'member_administrator' WHERE "recipient_type" = 'admin';

-- Logiranje promjena
INSERT INTO "audit_logs" ("action_type", "performed_by", "action_details", "ip_address", "created_at", "status")
VALUES (
    'SYSTEM_DATA_MIGRATION',
    NULL,
    '{"description": "Migracija podataka - ažuriranje terminologije uloga", "changes": ["admin -> member_administrator", "superuser -> member_superuser"]}',
    '127.0.0.1',
    CURRENT_TIMESTAMP,
    'success'
);
