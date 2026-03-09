-- Add created_at to profiles for "member since"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
