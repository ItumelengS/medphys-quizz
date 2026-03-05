-- Add 2-round limit per player with tiebreaker 3rd round for podium ties.
-- Hard cap: 3 rounds max (only if tiebreaker eligible).

CREATE OR REPLACE FUNCTION submit_tournament_round(
  p_tournament_id uuid,
  p_user_id uuid,
  p_score int,
  p_total int,
  p_time_bonus int,
  p_berserk boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
  v_accuracy numeric;
  v_fire_multiplier int;
  v_new_fire_streak int;
  v_base_points int;
  v_round_points int;
  v_berserk_multiplier numeric;
  v_round_id uuid;
  v_podium_cutoff int;
BEGIN
  -- Upsert participant
  INSERT INTO tournament_participants (tournament_id, user_id)
  VALUES (p_tournament_id, p_user_id)
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  -- Get current participant state
  SELECT * INTO v_participant
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;

  -- Round limit enforcement
  IF v_participant.rounds_played >= 3 THEN
    RAISE EXCEPTION 'Round limit reached: maximum 3 rounds played'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_participant.rounds_played >= 2 THEN
    -- Check tiebreaker eligibility: player must be tied for podium (top 3 distinct point values)
    SELECT MIN(pts) INTO v_podium_cutoff
    FROM (
      SELECT DISTINCT total_points AS pts
      FROM tournament_participants
      WHERE tournament_id = p_tournament_id
      ORDER BY pts DESC
      LIMIT 3
    ) top3;

    IF v_podium_cutoff IS NULL OR v_participant.total_points < v_podium_cutoff THEN
      RAISE EXCEPTION 'Round limit reached: you have played 2 rounds'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Calculate accuracy
  v_accuracy := CASE WHEN p_total > 0 THEN (p_score::numeric / p_total) * 100 ELSE 0 END;

  -- Fire streak: >=80% accuracy increases streak, otherwise resets
  IF v_accuracy >= 80 THEN
    v_new_fire_streak := COALESCE(v_participant.current_fire_streak, 0) + 1;
  ELSE
    v_new_fire_streak := 0;
  END IF;

  -- Fire multiplier based on streak
  v_fire_multiplier := CASE
    WHEN v_new_fire_streak >= 5 THEN 4
    WHEN v_new_fire_streak >= 3 THEN 3
    WHEN v_new_fire_streak >= 2 THEN 2
    ELSE 1
  END;

  -- Base points: correct * 50 + time_bonus (remaining seconds * 10)
  v_base_points := (p_score * 50) + p_time_bonus;

  -- Apply fire multiplier
  v_round_points := v_base_points * v_fire_multiplier;

  -- Berserk: if opted in and score >= 60%, multiply by 1.5
  v_berserk_multiplier := 1.0;
  IF p_berserk AND v_accuracy >= 60 THEN
    v_berserk_multiplier := 1.5;
    v_round_points := CEIL(v_round_points * v_berserk_multiplier);
  ELSIF p_berserk THEN
    -- Berserk failed: halve points
    v_round_points := CEIL(v_round_points * 0.5);
  END IF;

  -- Insert round record
  INSERT INTO tournament_rounds (tournament_id, user_id, score, total, points_earned, berserk, time_bonus, fire_multiplier)
  VALUES (p_tournament_id, p_user_id, p_score, p_total, v_round_points, p_berserk, p_time_bonus, v_fire_multiplier)
  RETURNING id INTO v_round_id;

  -- Update participant totals
  UPDATE tournament_participants
  SET
    total_points = total_points + v_round_points,
    rounds_played = rounds_played + 1,
    best_round_score = GREATEST(best_round_score, v_round_points),
    fire_streak = GREATEST(fire_streak, v_new_fire_streak),
    current_fire_streak = v_new_fire_streak,
    berserk_rounds = berserk_rounds + CASE WHEN p_berserk THEN 1 ELSE 0 END
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'round_id', v_round_id,
    'points_earned', v_round_points,
    'base_points', v_base_points,
    'fire_multiplier', v_fire_multiplier,
    'fire_streak', v_new_fire_streak,
    'berserk_multiplier', v_berserk_multiplier,
    'accuracy', ROUND(v_accuracy, 1)
  );
END;
$$;
