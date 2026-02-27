-- Add difficulty rating (1-10) to questions
ALTER TABLE questions ADD COLUMN difficulty smallint NOT NULL DEFAULT 5
  CHECK (difficulty >= 1 AND difficulty <= 10);

CREATE INDEX idx_questions_difficulty ON questions(difficulty);
