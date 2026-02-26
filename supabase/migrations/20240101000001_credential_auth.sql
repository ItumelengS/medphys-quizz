-- Add password_hash column for email/password authentication
ALTER TABLE next_auth.users ADD COLUMN IF NOT EXISTS password_hash text;

-- RPC: look up user by email (for login)
CREATE OR REPLACE FUNCTION get_user_by_email(p_email text)
RETURNS TABLE(id uuid, name text, email text, password_hash text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT u.id, u.name, u.email, u.password_hash
  FROM next_auth.users u
  WHERE u.email = p_email
  LIMIT 1;
$$;

-- RPC: check if email already exists
CREATE OR REPLACE FUNCTION email_exists(p_email text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM next_auth.users WHERE email = p_email);
$$;

-- RPC: register a new user
CREATE OR REPLACE FUNCTION register_user(p_name text, p_email text, p_password_hash text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO next_auth.users (name, email, password_hash)
  VALUES (p_name, p_email, p_password_hash)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
