-- Weekly challenges progress tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_challenge_progress (
  user_id       text NOT NULL,
  challenge_id  text NOT NULL,
  week_start    date NOT NULL,
  current_value int  NOT NULL DEFAULT 0,
  completed     boolean NOT NULL DEFAULT false,
  xp_awarded    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, challenge_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_challenge_user_week
  ON weekly_challenge_progress(user_id, week_start);

ALTER TABLE weekly_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read weekly_challenge_progress"
  ON weekly_challenge_progress FOR SELECT USING (true);
CREATE POLICY "Service role manages weekly_challenge_progress"
  ON weekly_challenge_progress FOR ALL USING (true);
