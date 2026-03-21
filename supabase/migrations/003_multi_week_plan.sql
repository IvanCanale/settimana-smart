-- Phase 5: Multi-week plan support
-- Adds week_iso scoping, plan status, feedback note, and shopping checked items

ALTER TABLE weekly_plan
  ADD COLUMN IF NOT EXISTS week_iso TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS feedback_note TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS checked_items JSONB DEFAULT '[]';

-- Drop old single-user unique constraint
ALTER TABLE weekly_plan DROP CONSTRAINT IF EXISTS weekly_plan_user_id_key;

-- New composite unique: one plan per user per week
ALTER TABLE weekly_plan
  ADD CONSTRAINT weekly_plan_user_id_week_iso_key UNIQUE (user_id, week_iso);
