-- Kreiranje SenderType enuma ako ne postoji
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sendertype') THEN
    CREATE TYPE "SenderType" AS ENUM ('member', 'admin', 'superuser');
  END IF;
END$$;

-- Pretvorba kolone sender_type iz varchar u SenderType enum
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'member_messages'
  ) THEN
    -- Privremeno preimenovanje kolone
    ALTER TABLE "member_messages" RENAME COLUMN "sender_type" TO "sender_type_old";
    
    -- Dodavanje nove kolone s enum tipom
    ALTER TABLE "member_messages" ADD COLUMN "sender_type" "SenderType";
    
    -- Kopiranje podataka iz stare kolone u novu s konverzijom
    UPDATE "member_messages" 
    SET "sender_type" = 
      CASE 
        WHEN "sender_type_old" = 'member' THEN 'member'::"SenderType"
        WHEN "sender_type_old" = 'admin' THEN 'admin'::"SenderType"
        WHEN "sender_type_old" = 'superuser' THEN 'superuser'::"SenderType"
        ELSE 'member'::"SenderType" 
      END;
    
    -- Postavljanje default vrijednosti
    ALTER TABLE "member_messages" ALTER COLUMN "sender_type" SET DEFAULT 'member'::"SenderType";
    
    -- Uklanjanje stare kolone
    ALTER TABLE "member_messages" DROP COLUMN "sender_type_old";
  END IF;
END$$;
