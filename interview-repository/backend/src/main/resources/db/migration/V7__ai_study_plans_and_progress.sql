-- AI-generated study plans (from the AI service's Preparation Agent) and per-topic progress.
-- Applied automatically in development by Hibernate (ddl-auto=update); run manually in production.

ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS target_company_name VARCHAR(150);
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS days_available INTEGER;
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS source VARCHAR(20);
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS plan_json TEXT;

ALTER TABLE progress ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE progress ADD COLUMN IF NOT EXISTS priority INTEGER;
ALTER TABLE progress ADD COLUMN IF NOT EXISTS sample_questions TEXT;

CREATE INDEX IF NOT EXISTS idx_study_plan_student ON study_plan(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_study_plan ON progress(study_plan_id);
