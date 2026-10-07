-- Fix moderation_log entity_type constraint to allow MENTOR and ALUMNI
-- Drop the old constraint if it exists
ALTER TABLE moderation_log DROP CONSTRAINT IF EXISTS ck_moderation_log_entity_type;

-- Add updated constraint that includes all entity types
ALTER TABLE moderation_log
ADD CONSTRAINT ck_moderation_log_entity_type
CHECK (entity_type IN ('STUDENT', 'MENTOR', 'ALUMNI', 'INTERVIEW_EXPERIENCE', 'APPLICATION'));

-- Add comment to document the allowed values
COMMENT ON CONSTRAINT ck_moderation_log_entity_type ON moderation_log
IS 'Allowed entity types: STUDENT, MENTOR, ALUMNI, INTERVIEW_EXPERIENCE, APPLICATION';
