-- 008_rls_user_tables.sql
-- Ensures RLS is enabled with correct user-scoped policies on all user data tables.
-- Safe to run multiple times (IF NOT EXISTS guards).

-- ── weekly_plan ──────────────────────────────────────────────────────────────
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

-- ── preferences ──────────────────────────────────────────────────────────────
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

-- ── pantry ───────────────────────────────────────────────────────────────────
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
