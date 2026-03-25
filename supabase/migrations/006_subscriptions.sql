-- 006_subscriptions.sql
-- Stripe subscription integration tables

-- customers: private mapping of user_id to stripe_customer_id
CREATE TABLE customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies: only service role writes and reads

-- subscriptions: synced from Stripe webhooks
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,                     -- Stripe subscription ID (sub_xxx)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,                    -- trialing | active | canceled | past_due | paused
  plan_tier TEXT,                          -- base | pro | null
  price_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription (for client-side display of plan name/trial status)
CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
-- Only service role writes (webhook handler uses SUPABASE_SERVICE_ROLE_KEY)

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
