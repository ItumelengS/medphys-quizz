-- Standalone crossword clues table (not tied to the questions table)
CREATE TABLE IF NOT EXISTS crossword_clues (
  id TEXT PRIMARY KEY,
  clue TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL
);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_crossword_clues_category ON crossword_clues (category);
