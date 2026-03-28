"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { verifyAccessToken } from "@/lib/serverAuth";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Create a Stripe Checkout Session for a new subscription.
 * Accepts the user's Supabase access token (not userId) to verify identity server-side.
 */
export async function createCheckoutSession(
  accessToken: string,
  planType: "base" | "pro",
  billing: "monthly" | "annual" = "monthly",
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  try {
    const user = await verifyAccessToken(accessToken);
    if (!user) return { error: "Non autorizzato" };

    const priceId =
      planType === "base"
        ? (billing === "annual" ? process.env.STRIPE_PRICE_ID_BASE_ANNUAL! : process.env.STRIPE_PRICE_ID_BASE!)
        : (billing === "annual" ? process.env.STRIPE_PRICE_ID_PRO_ANNUAL! : process.env.STRIPE_PRICE_ID_PRO!);

    if (!priceId) return { error: `Price ID mancante: ${planType}_${billing}` };

    const supabase = adminClient();

    // Calculate remaining trial days based on user.created_at
    const createdAt = user.created_at ? new Date(user.created_at) : new Date();
    const trialEnd = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const hasTrialRemaining = trialEnd > new Date();

    // Find or create Stripe customer
    const { data: existing } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("customers")
        .insert({ user_id: user.id, stripe_customer_id: customerId });
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_collection: hasTrialRemaining ? "if_required" : "always",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(hasTrialRemaining ? {
        subscription_data: {
          trial_end: Math.floor(trialEnd.getTime() / 1000),
          trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        },
      } : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento?canceled=1`,
    });

    return { url: session.url! };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createCheckoutSession]", msg);
    return { error: msg };
  }
}

/**
 * Create a Stripe Customer Portal session for managing an existing subscription.
 */
export async function createPortalSession(accessToken: string) {
  const user = await verifyAccessToken(accessToken);
  if (!user) throw new Error("Non autorizzato");

  const supabase = adminClient();
  const { data } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!data?.stripe_customer_id) {
    throw new Error("No Stripe customer found for this user");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento`,
  });

  redirect(session.url);
}

/**
 * Fetch a user's subscription status.
 */
export async function getSubscriptionAction(accessToken: string) {
  const user = await verifyAccessToken(accessToken);
  if (!user) return null;
  const { getSubscription } = await import("@/lib/stripe");
  return getSubscription(user.id);
}
