-- Migration: 001_create_recipes
-- Creates the shared recipes catalog table with RLS and indexes.
-- All users read from this shared table; writes are service-role only (Edge Function + seed script).

CREATE TABLE recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  title_normalized TEXT GENERATED ALWAYS AS (
    lower(translate(title, 'àáâãäèéêëìíîïòóôõöùúûüý', 'aaaaaeeeeiiiioooooouuuuy'))
  ) STORED,
  diet          TEXT[] NOT NULL,
  tags          TEXT[] DEFAULT '{}',
  time          INTEGER NOT NULL,
  difficulty    TEXT NOT NULL,
  servings      INTEGER NOT NULL DEFAULT 2,
  ingredients   JSONB NOT NULL,
  steps         TEXT[] NOT NULL,
  estimated_cost NUMERIC(5,2),
  protein_category TEXT,
  source_url    TEXT,
  added_by      TEXT NOT NULL DEFAULT 'seed',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(title_normalized)
);

-- RLS: public read (shared catalog), service-role write only
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON recipes FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE policy = only service role key (used by Edge Function + seed script) can write

-- Indexes for common access patterns
CREATE INDEX idx_recipes_diet ON recipes USING GIN(diet);
CREATE INDEX idx_recipes_added_at ON recipes(created_at DESC);
