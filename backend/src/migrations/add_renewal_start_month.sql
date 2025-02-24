ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS renewal_start_month INTEGER DEFAULT 11;