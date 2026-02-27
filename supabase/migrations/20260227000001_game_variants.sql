-- Game Variants: widen leaderboard mode constraint, add game_results table

-- 1. Drop and recreate the mode check constraint to include game variant modes
ALTER TABLE leaderboard_entries DROP CONSTRAINT IF EXISTS leaderboard_entries_mode_check;
ALTER TABLE leaderboard_entries ADD CONSTRAINT leaderboard_entries_mode_check
  CHECK (mode IN ('speed', 'daily', 'review', 'sudden-death', 'sprint', 'crossword'));

-- 2. Game results table for variant-specific data
CREATE TABLE IF NOT EXISTS game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('sudden-death', 'sprint', 'crossword')),
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  points int NOT NULL DEFAULT 0,
  xp_earned int NOT NULL DEFAULT 0,
  best_streak int NOT NULL DEFAULT 0,
  duration_seconds int,
  metadata jsonb NOT NULL DEFAULT '{}',
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_results_user ON game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_variant ON game_results(variant);
CREATE INDEX IF NOT EXISTS idx_game_results_played ON game_results(played_at DESC);

-- RLS
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read game_results" ON game_results FOR SELECT USING (true);
CREATE POLICY "Users insert own game_results" ON game_results FOR INSERT WITH CHECK (next_auth.uid() = user_id);
