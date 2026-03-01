ALTER TABLE crossword_clues ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
CREATE INDEX IF NOT EXISTS idx_crossword_clues_difficulty ON crossword_clues (difficulty);
