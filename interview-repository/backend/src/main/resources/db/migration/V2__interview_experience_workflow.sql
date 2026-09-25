-- Team A Interview Experience Management.
-- This repository does not run Flyway; production must apply this migration
-- through the deployment's PostgreSQL schema process before enabling /api/interviews.

ALTER TABLE interview_experience
    ADD COLUMN IF NOT EXISTS submitted_by UUID,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS provenance VARCHAR(100),
    ADD COLUMN IF NOT EXISTS preparation TEXT,
    ADD COLUMN IF NOT EXISTS timeline TEXT,
    ADD COLUMN IF NOT EXISTS interview_result VARCHAR(50),
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

UPDATE interview_experience
SET submitted_at = COALESCE(submitted_at, created_at),
    moderation_status = COALESCE(moderation_status, status, 'PENDING')
WHERE submitted_at IS NULL OR moderation_status IS NULL;

ALTER TABLE interview_experience
    ADD CONSTRAINT fk_interview_submitted_by
    FOREIGN KEY (submitted_by) REFERENCES app_users(id);

CREATE TABLE IF NOT EXISTS interview_round (
    id UUID PRIMARY KEY,
    interview_id UUID NOT NULL REFERENCES interview_experience(id) ON DELETE CASCADE,
    round_order INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    notes TEXT,
    CONSTRAINT uk_interview_round_order UNIQUE (interview_id, round_order)
);

ALTER TABLE question
    ADD COLUMN IF NOT EXISTS round_id UUID,
    ADD COLUMN IF NOT EXISTS topic VARCHAR(100),
    ADD COLUMN IF NOT EXISTS question_order INTEGER;

ALTER TABLE question
    ADD CONSTRAINT fk_question_round
    FOREIGN KEY (round_id) REFERENCES interview_round(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_interview_moderation_status
    ON interview_experience (moderation_status);
CREATE INDEX IF NOT EXISTS ix_interview_company_status
    ON interview_experience (company_id, moderation_status);
