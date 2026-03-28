-- 011_create_user_tables.sql
-- Creates the core user-scoped tables that were previously created manually in Supabase
-- and referenced (but never defined) in earlier migrations 003, 007, 008.
-- All statements use IF NOT EXISTS so this is safe to run on an existing database.

-- ── weekly_plan ────────────────────────────────────────────────────────────────
-- One row per user per ISO week. Stores seed, manual overrides, learning data,
-- feedback note, shopping check state, and the daily regeneration log.
CREATE TABLE IF NOT EXISTS weekly_plan (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_iso         TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'active',  -- draft | active | archived
  seed             INTEGER NOT NULL DEFAULT 1,
  manual_overrides JSONB DEFAULT '{}',
  learning         JSONB DEFAULT '{}',
  feedback_note    TEXT DEFAULT '',
  checked_items    JSONB DEFAULT '[]',
  rigenera_log     JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_iso)
);

ALTER TABLE weekly_plan ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weekly_plan' AND policyname = 'users_own_plans'
  ) THEN
    CREATE POLICY "users_own_plans" ON weekly_plan
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── preferences ────────────────────────────────────────────────────────────────
-- One row per user. Stores all app preferences as a JSONB blob (diet, maxTime,
-- shoppingDay, timezone, allergens, etc.).
CREATE TABLE IF NOT EXISTS preferences (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'preferences' AND policyname = 'users_own_preferences'
  ) THEN
    CREATE POLICY "users_own_preferences" ON preferences
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── pantry ─────────────────────────────────────────────────────────────────────
-- One row per user. Stores pantry items as a JSONB array
-- [{name, quantity, unit}, ...].
CREATE TABLE IF NOT EXISTS pantry (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items      JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pantry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pantry' AND policyname = 'users_own_pantry'
  ) THEN
    CREATE POLICY "users_own_pantry" ON pantry
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
