-- 007_rigenera_log.sql
-- Track regeneration events for Piano Base rate limiting
ALTER TABLE weekly_plan ADD COLUMN IF NOT EXISTS rigenera_log JSONB DEFAULT '[]';
