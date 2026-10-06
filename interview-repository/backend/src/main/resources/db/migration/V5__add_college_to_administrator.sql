-- Add college column to administrator table
ALTER TABLE administrator
ADD COLUMN IF NOT EXISTS college VARCHAR(200);
