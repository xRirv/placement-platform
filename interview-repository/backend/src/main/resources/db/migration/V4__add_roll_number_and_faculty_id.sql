-- Add roll_number to student table
ALTER TABLE student
ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);

-- Add unique constraint to roll_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_roll_number ON student(roll_number) WHERE roll_number IS NOT NULL;

-- Add roll_number to placed_alumni table
ALTER TABLE placed_alumni
ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);

-- Add unique constraint to roll_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_alumni_roll_number ON placed_alumni(roll_number) WHERE roll_number IS NOT NULL;

-- Add faculty_id to mentor table
ALTER TABLE mentor
ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(50);

-- Add unique constraint to faculty_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentor_faculty_id ON mentor(faculty_id) WHERE faculty_id IS NOT NULL;
