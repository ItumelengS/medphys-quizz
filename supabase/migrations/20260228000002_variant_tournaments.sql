-- Expand tournament type constraint to include sudden-death and sprint tournament types
-- ============================================================

alter table tournaments drop constraint if exists tournaments_type_check;
alter table tournaments add constraint tournaments_type_check
  check (type in (
    'blitz', 'rapid', 'marathon',
    'crossword-blitz', 'crossword-rapid', 'crossword-marathon',
    'sudden-death-blitz', 'sudden-death-rapid',
    'sprint-blitz', 'sprint-rapid'
  ));
