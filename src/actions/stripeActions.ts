"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Create a Stripe Checkout Session for a new subscription.
 * Includes 14-day free trial with no card required.
 * Redirects the user to Stripe's hosted checkout page.
 * Accepts planType ("base" | "pro") and resolves the Stripe priceId server-side.
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  planType: "base" | "pro",
  billing: "monthly" | "annual" = "monthly",
) {
  const priceId =
    planType === "base"
      ? (billing === "annual" ? process.env.STRIPE_PRICE_ID_BASE_ANNUAL! : process.env.STRIPE_PRICE_ID_BASE!)
      : (billing === "annual" ? process.env.STRIPE_PRICE_ID_PRO_ANNUAL! : process.env.STRIPE_PRICE_ID_PRO!);

  const supabase = adminClient();

  // Find or create Stripe customer
  const { data: existing } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = existing?.stripe_customer_id;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: userEmail,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await supabase
      .from("customers")
      .insert({ user_id: userId, stripe_customer_id: customerId });
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_collection: "if_required", // No card required to start trial
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      trial_settings: {
        end_behavior: { missing_payment_method: "cancel" },
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento?canceled=1`,
  });

  return { url: session.url! };
}

/**
 * Create a Stripe Customer Portal session for managing an existing subscription.
 * Redirects the user to Stripe's hosted portal (upgrade/downgrade/cancel/payment method).
 */
export async function createPortalSession(userId: string) {
  const supabase = adminClient();
  const { data } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
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
 * Server action to fetch a user's subscription status.
 * Used by page.tsx (client component) to read tier without importing server-only stripe.ts directly.
 */
export async function getSubscriptionAction(userId: string) {
  const { getSubscription } = await import("@/lib/stripe");
  return getSubscription(userId);
}
