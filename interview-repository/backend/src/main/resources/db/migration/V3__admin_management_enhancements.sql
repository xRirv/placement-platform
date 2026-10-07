-- Migration for Admin Management System Enhancements
-- Adds support for moderation log status, notes, and review tracking

-- Add new columns to moderation_log table
ALTER TABLE moderation_log
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_moderation_log_status ON moderation_log(status);
CREATE INDEX IF NOT EXISTS idx_moderation_log_entity ON moderation_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_student_mentor ON student(mentor_id);
CREATE INDEX IF NOT EXISTS idx_student_active ON student(login_id);
CREATE INDEX IF NOT EXISTS idx_mentor_active ON mentor(login_id);
CREATE INDEX IF NOT EXISTS idx_alumni_active ON placed_alumni(login_id);

-- Add comment to document the changes
COMMENT ON COLUMN moderation_log.status IS 'Status of moderation action: PENDING, APPROVED, or REJECTED';
COMMENT ON COLUMN moderation_log.notes IS 'Admin notes when reviewing the moderation log';
COMMENT ON COLUMN moderation_log.reviewed_at IS 'Timestamp when the log was reviewed';
