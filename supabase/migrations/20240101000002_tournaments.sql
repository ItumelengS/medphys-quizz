-- Tournament system tables
-- ============================================================

-- Tournaments
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('blitz', 'rapid', 'marathon')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'finished')),
  config jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_tournaments_type_starts
  on tournaments (type, starts_at);

create index if not exists idx_tournaments_status
  on tournaments (status);

-- Tournament participants
create table if not exists tournament_participants (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id uuid not null references next_auth.users(id) on delete cascade,
  display_name text not null default '',
  total_points int not null default 0,
  rounds_played int not null default 0,
  best_round_score int not null default 0,
  fire_streak int not null default 0,
  current_fire_streak int not null default 0,
  berserk_rounds int not null default 0,
  primary key (tournament_id, user_id)
);

create index if not exists idx_tp_leaderboard
  on tournament_participants (tournament_id, total_points desc);

-- Tournament rounds
create table if not exists tournament_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id uuid not null references next_auth.users(id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  points_earned int not null default 0,
  berserk boolean not null default false,
  time_bonus int not null default 0,
  fire_multiplier int not null default 1,
  played_at timestamptz not null default now()
);

create index if not exists idx_tr_tournament_user
  on tournament_rounds (tournament_id, user_id);

-- RLS
alter table tournaments enable row level security;
alter table tournament_participants enable row level security;
alter table tournament_rounds enable row level security;

create policy "Anyone can read tournaments" on tournaments for select using (true);
create policy "Anyone can read tournament participants" on tournament_participants for select using (true);
create policy "Anyone can read tournament rounds" on tournament_rounds for select using (true);

-- ============================================================
-- RPC: submit_tournament_round
-- Atomic: calculates fire multiplier + berserk bonus, inserts round, updates participant
-- ============================================================

create or replace function submit_tournament_round(
  p_tournament_id uuid,
  p_user_id uuid,
  p_score int,
  p_total int,
  p_time_bonus int,
  p_berserk boolean default false
)
returns jsonb as $$
declare
  v_participant tournament_participants%rowtype;
  v_accuracy numeric;
  v_fire_multiplier int;
  v_new_fire_streak int;
  v_base_points int;
  v_round_points int;
  v_berserk_multiplier numeric;
  v_round_id uuid;
begin
  -- Get or create participant record
  select * into v_participant
    from tournament_participants
    where tournament_id = p_tournament_id and user_id = p_user_id;

  if not found then
    raise exception 'Participant not found. Join the tournament first.';
  end if;

  -- Calculate accuracy
  v_accuracy := case when p_total > 0 then (p_score::numeric / p_total) * 100 else 0 end;

  -- Calculate fire streak (>=80% keeps it going)
  if v_accuracy >= 80 then
    v_new_fire_streak := v_participant.current_fire_streak + 1;
  else
    v_new_fire_streak := 0;
  end if;

  -- Fire multiplier (capped at 4x)
  v_fire_multiplier := least(4, greatest(1, v_new_fire_streak));

  -- Base points: correct * 100 + time_bonus (remaining seconds * 10)
  v_base_points := (p_score * 100) + p_time_bonus;

  -- Apply fire multiplier
  v_round_points := v_base_points * v_fire_multiplier;

  -- Berserk: if opted in and score >= 60%, multiply by 1.5
  v_berserk_multiplier := 1.0;
  if p_berserk then
    if v_accuracy >= 60 then
      v_berserk_multiplier := 1.5;
    end if;
  end if;

  v_round_points := floor(v_round_points * v_berserk_multiplier);

  -- Insert round
  insert into tournament_rounds (tournament_id, user_id, score, total, points_earned, berserk, time_bonus, fire_multiplier)
  values (p_tournament_id, p_user_id, p_score, p_total, v_round_points, p_berserk, p_time_bonus, v_fire_multiplier)
  returning id into v_round_id;

  -- Update participant
  update tournament_participants set
    total_points = total_points + v_round_points,
    rounds_played = rounds_played + 1,
    best_round_score = greatest(best_round_score, v_round_points),
    fire_streak = greatest(fire_streak, v_new_fire_streak),
    current_fire_streak = v_new_fire_streak,
    berserk_rounds = berserk_rounds + case when p_berserk then 1 else 0 end
  where tournament_id = p_tournament_id and user_id = p_user_id;

  return jsonb_build_object(
    'round_id', v_round_id,
    'points_earned', v_round_points,
    'fire_multiplier', v_fire_multiplier,
    'fire_streak', v_new_fire_streak,
    'berserk_bonus', p_berserk and v_accuracy >= 60,
    'accuracy', round(v_accuracy, 1)
  );
end;
$$ language plpgsql security definer;
