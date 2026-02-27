-- Expand tournament type constraint to include crossword, sudden-death, and sprint types
-- ============================================================

-- Drop the existing check constraint on tournament type and recreate with all game types
alter table tournaments drop constraint if exists tournaments_type_check;
alter table tournaments add constraint tournaments_type_check
  check (type in (
    'blitz', 'rapid', 'marathon',
    'crossword-blitz', 'crossword-rapid', 'crossword-marathon',
    'sudden-death-blitz', 'sudden-death-rapid',
    'sprint-blitz', 'sprint-rapid'
  ));
