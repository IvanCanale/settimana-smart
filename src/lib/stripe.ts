import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { SubscriptionTier, SubscriptionStatus } from "@/types";

// Server-side Stripe singleton — only import this file in server contexts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Plan tier lookup from price ID
export function getPlanTier(priceId: string | undefined): "base" | "pro" | null {
  if (priceId === process.env.STRIPE_PRICE_ID_BASE) return "base";
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro";
  return null;
}

// Service-role Supabase client for server-side subscription reads
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Read current subscription status for a user from the subscriptions table.
 * Returns tier="free" if no active/trialing subscription exists.
 * During trial, tier is "pro" (full access).
 */
export async function getSubscription(userId: string): Promise<SubscriptionStatus> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan_tier, trial_end")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return { tier: "free", isTrialing: false, trialEnd: null, status: "none" };
  }

  // During trial, user gets full Pro access regardless of which price they signed up for
  const tier: SubscriptionTier =
    data.status === "trialing" ? "pro"
    : data.plan_tier === "pro" ? "pro"
    : "base";

  return {
    tier,
    isTrialing: data.status === "trialing",
    trialEnd: data.trial_end ? new Date(data.trial_end) : null,
    status: data.status,
  };
}

/**
 * Look up Supabase user_id from Stripe customer ID via the customers table.
 */
export async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.user_id ?? null;
}
