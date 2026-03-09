-- Per-variant Glicko-2 rating system (like Lichess)
-- ============================================================

-- Current ratings per user per variant
CREATE TABLE IF NOT EXISTS variant_ratings (
  user_id     uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  variant     text NOT NULL,
  rating      real NOT NULL DEFAULT 1500,
  rd          real NOT NULL DEFAULT 350,
  volatility  real NOT NULL DEFAULT 0.06,
  peak_rating real NOT NULL DEFAULT 1500,
  games_count int  NOT NULL DEFAULT 0,
  last_played timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, variant)
);

CREATE INDEX IF NOT EXISTS idx_variant_ratings_variant ON variant_ratings(variant);
CREATE INDEX IF NOT EXISTS idx_variant_ratings_ranking ON variant_ratings(variant, rating DESC);

ALTER TABLE variant_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read variant_ratings" ON variant_ratings FOR SELECT USING (true);
CREATE POLICY "Service role manages variant_ratings" ON variant_ratings FOR ALL USING (true);

-- Rating history for sparklines/trends
CREATE TABLE IF NOT EXISTS rating_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  variant    text NOT NULL,
  rating     real NOT NULL,
  rd         real NOT NULL,
  played_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rating_history_user_variant ON rating_history(user_id, variant, played_at DESC);

ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rating_history" ON rating_history FOR SELECT USING (true);
CREATE POLICY "Service role manages rating_history" ON rating_history FOR ALL USING (true);
