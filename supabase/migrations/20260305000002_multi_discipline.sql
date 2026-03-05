-- Multi-discipline support
-- Discipline values: 'physicist', 'therapist', 'oncologist', 'engineer'

-- Add discipline column to profiles (default 'physicist' for existing users)
ALTER TABLE profiles ADD COLUMN discipline text NOT NULL DEFAULT 'physicist';

-- Add discipline tags to questions (array — a question can apply to multiple disciplines)
ALTER TABLE questions ADD COLUMN disciplines text[] NOT NULL DEFAULT '{physicist}';
CREATE INDEX idx_questions_disciplines ON questions USING GIN (disciplines);

-- Add discipline tags to crossword_clues
ALTER TABLE crossword_clues ADD COLUMN disciplines text[] NOT NULL DEFAULT '{physicist}';
CREATE INDEX idx_crossword_clues_disciplines ON crossword_clues USING GIN (disciplines);

-- Add discipline to tournaments ('open' = all disciplines welcome)
ALTER TABLE tournaments ADD COLUMN discipline text NOT NULL DEFAULT 'open';
