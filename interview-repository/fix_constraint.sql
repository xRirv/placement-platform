-- Connect to your Supabase database and run this

-- Drop the old constraint
ALTER TABLE moderation_log DROP CONSTRAINT IF EXISTS ck_moderation_log_entity_type;

-- Add updated constraint that includes MENTOR and ALUMNI
ALTER TABLE moderation_log
ADD CONSTRAINT ck_moderation_log_entity_type
CHECK (entity_type IN ('STUDENT', 'MENTOR', 'ALUMNI', 'INTERVIEW_EXPERIENCE', 'APPLICATION', 'COMPANY'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'ck_moderation_log_entity_type';
