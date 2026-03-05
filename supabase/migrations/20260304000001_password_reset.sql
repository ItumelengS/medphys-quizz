-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false
);

-- RPC: create a password reset token for a user by email
CREATE OR REPLACE FUNCTION create_password_reset_token(p_email text)
RETURNS TABLE(token uuid, user_name text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_token uuid;
BEGIN
  SELECT u.id, u.name INTO v_user_id, v_user_name
  FROM next_auth.users u
  WHERE u.email = p_email AND u.password_hash IS NOT NULL
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM password_reset_tokens WHERE password_reset_tokens.user_id = v_user_id;

  INSERT INTO password_reset_tokens (user_id, expires_at)
  VALUES (v_user_id, now() + interval '1 hour')
  RETURNING password_reset_tokens.token INTO v_token;

  RETURN QUERY SELECT v_token, v_user_name;
END;
$$;

-- RPC: use a password reset token to update password
CREATE OR REPLACE FUNCTION use_password_reset_token(p_token uuid, p_new_hash text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT t.user_id INTO v_user_id
  FROM password_reset_tokens t
  WHERE t.token = p_token
    AND t.used = false
    AND t.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE next_auth.users SET password_hash = p_new_hash WHERE id = v_user_id;
  UPDATE password_reset_tokens SET used = true WHERE password_reset_tokens.token = p_token;

  RETURN true;
END;
$$;
