"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

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
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  priceId: string,
) {
  const supabase = adminClient();

  // Find or create Stripe customer
  const { data: existing } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = existing?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await supabase
      .from("customers")
      .insert({ user_id: userId, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
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

  redirect(session.url!);
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

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento`,
  });

  redirect(session.url);
}
