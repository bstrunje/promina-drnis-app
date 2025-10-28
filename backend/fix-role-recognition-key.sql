-- Fix: Zamijeni PARTICIPANT s REGULAR u activityRoleRecognition JSON polju
-- Ovo je potrebno jer Prisma enum koristi REGULAR, a ne PARTICIPANT

UPDATE system_settings
SET activity_role_recognition = jsonb_set(
    activity_role_recognition::jsonb - 'PARTICIPANT',
    '{REGULAR}',
    (activity_role_recognition::jsonb -> 'PARTICIPANT')
)
WHERE activity_role_recognition::jsonb ? 'PARTICIPANT';

-- Provjeri rezultat
SELECT 
    id,
    organization_id,
    activity_role_recognition
FROM system_settings
WHERE activity_role_recognition IS NOT NULL;
