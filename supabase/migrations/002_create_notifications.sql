-- Migration: 002_create_notifications
-- Creates the shared notifications table for in-app recipe catalog updates.
-- Populated by the weekly catalog Edge Function; read by NotificationDrawer.

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  read        BOOLEAN DEFAULT FALSE
);

-- Public read (single shared notification feed — no user_id needed)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON notifications FOR SELECT TO anon, authenticated USING (true);
