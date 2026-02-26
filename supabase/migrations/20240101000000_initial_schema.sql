-- MedPhys Quiz Supabase Schema

-- ============================================================
-- 1. NextAuth tables — must live in "next_auth" schema
--    (the @auth/supabase-adapter hardcodes this schema name)
-- ============================================================

create schema if not exists next_auth;

-- uid() helper used by RLS policies on the next_auth tables
create or replace function next_auth.uid() returns uuid
  language sql stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;

-- Users
create table if not exists next_auth.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);

-- Accounts
create table if not exists next_auth.accounts (
  id uuid primary key default gen_random_uuid(),
  type text,
  provider text,
  "providerAccountId" text,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  "userId" uuid references next_auth.users(id) on delete cascade
);

-- Sessions
create table if not exists next_auth.sessions (
  id uuid primary key default gen_random_uuid(),
  expires timestamptz,
  "sessionToken" text unique,
  "userId" uuid references next_auth.users(id) on delete cascade
);

-- Verification tokens
create table if not exists next_auth.verification_tokens (
  id serial primary key,
  identifier text,
  token text unique,
  expires timestamptz
);

-- Grant the service_role (used by the adapter) access to next_auth schema
grant usage on schema next_auth to service_role;
grant all on all tables    in schema next_auth to service_role;
grant all on all sequences in schema next_auth to service_role;

-- ============================================================
-- 2. App tables — public schema
-- ============================================================

-- Sections
create table if not exists sections (
  id text primary key,
  name text not null,
  icon text not null default '',
  color text not null default '#000',
  description text not null default '',
  sort_order int not null default 0
);

-- Questions
create table if not exists questions (
  id text primary key,
  section_id text not null references sections(id) on delete cascade,
  question text not null,
  answer text not null,
  choices text[] not null default '{}',
  explanation text not null default ''
);

create index if not exists idx_questions_section on questions(section_id);

-- Profiles (extends NextAuth users)
create table if not exists profiles (
  id uuid primary key references next_auth.users(id) on delete cascade,
  display_name text not null default '',
  xp int not null default 0,
  role text not null default 'player' check (role in ('player', 'admin'))
);

-- User stats
create table if not exists user_stats (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  total_answered int not null default 0,
  total_correct int not null default 0,
  games_played int not null default 0,
  best_score int,
  best_streak int not null default 0,
  daily_streak int not null default 0,
  last_daily_date date
);

-- Question history (spaced repetition)
create table if not exists question_history (
  user_id uuid not null references next_auth.users(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  times_shown int not null default 0,
  times_correct int not null default 0,
  ease_factor real not null default 2.5,
  interval int not null default 0,
  next_due timestamptz not null default now(),
  streak int not null default 0,
  last_shown timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Leaderboard entries
create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  player_name text not null,
  score int not null,
  total int not null,
  points int not null default 0,
  best_streak int not null default 0,
  section text not null,
  section_name text not null,
  mode text not null check (mode in ('speed', 'daily', 'review')),
  played_at timestamptz not null default now()
);

create index if not exists idx_leaderboard_mode on leaderboard_entries(mode);
create index if not exists idx_leaderboard_played on leaderboard_entries(played_at desc);

-- Daily challenges
create table if not exists daily_challenges (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  last_completed_date date,
  last_score int
);

-- ============================================================
-- 3. RPC functions
-- ============================================================

create or replace function increment_xp(p_user_id uuid, p_amount int)
returns void as $$
begin
  update profiles set xp = xp + p_amount where id = p_user_id;
end;
$$ language plpgsql security definer;

create or replace function update_user_stats_after_quiz(
  p_user_id uuid,
  p_answered int,
  p_correct int,
  p_best_streak int,
  p_best_score int default null,
  p_is_daily boolean default false,
  p_daily_streak int default null
)
returns void as $$
begin
  insert into user_stats (user_id, total_answered, total_correct, games_played, best_score, best_streak, daily_streak, last_daily_date)
  values (p_user_id, p_answered, p_correct, 1, p_best_score, p_best_streak,
          case when p_is_daily then coalesce(p_daily_streak, 1) else 0 end,
          case when p_is_daily then current_date else null end)
  on conflict (user_id) do update set
    total_answered = user_stats.total_answered + p_answered,
    total_correct = user_stats.total_correct + p_correct,
    games_played = user_stats.games_played + 1,
    best_score = case
      when p_best_score is not null then greatest(coalesce(user_stats.best_score, 0), p_best_score)
      else user_stats.best_score
    end,
    best_streak = greatest(user_stats.best_streak, p_best_streak),
    daily_streak = case
      when p_is_daily then coalesce(p_daily_streak, user_stats.daily_streak + 1)
      else user_stats.daily_streak
    end,
    last_daily_date = case
      when p_is_daily then current_date
      else user_stats.last_daily_date
    end;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 4. Row Level Security (safety net — API routes use service-role key)
-- ============================================================

alter table sections enable row level security;
alter table questions enable row level security;
alter table profiles enable row level security;
alter table user_stats enable row level security;
alter table question_history enable row level security;
alter table leaderboard_entries enable row level security;
alter table daily_challenges enable row level security;

-- Public read for sections and questions
create policy "Anyone can read sections" on sections for select using (true);
create policy "Anyone can read questions" on questions for select using (true);

-- Users can read/write their own data
create policy "Users read own profile" on profiles for select using (next_auth.uid() = id);
create policy "Users update own profile" on profiles for update using (next_auth.uid() = id);

create policy "Users read own stats" on user_stats for select using (next_auth.uid() = user_id);
create policy "Users read own history" on question_history for select using (next_auth.uid() = user_id);

-- Leaderboard is public read
create policy "Anyone can read leaderboard" on leaderboard_entries for select using (true);
create policy "Users insert own leaderboard" on leaderboard_entries for insert with check (next_auth.uid() = user_id);

create policy "Users read own daily" on daily_challenges for select using (next_auth.uid() = user_id);
