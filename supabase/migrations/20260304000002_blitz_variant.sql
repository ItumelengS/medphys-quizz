-- Add 'blitz' to game_results.variant and leaderboard_entries.mode constraints
-- ============================================================

alter table game_results drop constraint if exists game_results_variant_check;
alter table game_results add constraint game_results_variant_check
  check (variant in ('sudden-death', 'sprint', 'crossword', 'match', 'hot-seat', 'blitz'));

alter table leaderboard_entries drop constraint if exists leaderboard_entries_mode_check;
alter table leaderboard_entries add constraint leaderboard_entries_mode_check
  check (mode in ('speed', 'daily', 'review', 'sudden-death', 'sprint', 'crossword', 'match', 'hot-seat', 'arena', 'blitz'));
