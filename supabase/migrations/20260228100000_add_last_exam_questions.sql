ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_exam_questions jsonb DEFAULT '[]'::jsonb;
