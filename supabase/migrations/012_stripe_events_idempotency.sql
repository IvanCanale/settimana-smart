-- 012_stripe_events_idempotency.sql
-- Traccia gli eventi Stripe già processati per garantire idempotency.
-- Evita che retry di Stripe (es. timeout) processino due volte lo stesso evento.

CREATE TABLE IF NOT EXISTS stripe_events (
  id           TEXT PRIMARY KEY,  -- Stripe event ID (evt_xxx)
  type         TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo il service role può scrivere (webhook server-side)
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Nessun accesso client-side — solo service role via webhook
-- (nessuna policy = nessun accesso per anon/authenticated)
