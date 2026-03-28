-- 010_recipes_tier_rls.sql
-- Enforce recipe access by subscription tier at the database level.
-- Previously the "added_by != 'ai'" filter was only in client-side code, meaning
-- any user could bypass it by calling the Supabase REST API directly.
--
-- Strategy:
--   - anon (unauthenticated, free trial): see all recipes — consistent with 14-day trial UX
--   - authenticated base subscriber: only seed recipes (added_by != 'ai')
--   - authenticated pro subscriber: all recipes

-- Helper function: returns the user's active plan tier ('pro' or 'base').
-- Returns 'pro' when no active subscription exists (free trial = pro-level access).
-- SECURITY DEFINER so it can query subscriptions without exposing the table.
CREATE OR REPLACE FUNCTION public.get_user_tier(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT plan_tier
      FROM subscriptions
      WHERE user_id = uid
        AND status IN ('active', 'trialing')
      ORDER BY updated_at DESC
      LIMIT 1
    ),
    'pro'   -- no active subscription = free trial = pro access
  );
$$;

-- Replace the old permissive "Public read" policy with tier-aware policies.
DROP POLICY IF EXISTS "Public read" ON recipes;

-- Anon users (not logged in): see everything — supports the 14-day trial before signup.
CREATE POLICY "anon_read_all" ON recipes
  FOR SELECT TO anon
  USING (true);

-- Authenticated users: seed recipes always visible; AI recipes only for pro tier.
CREATE POLICY "auth_read_by_tier" ON recipes
  FOR SELECT TO authenticated
  USING (
    added_by != 'ai'
    OR public.get_user_tier(auth.uid()) = 'pro'
  );
