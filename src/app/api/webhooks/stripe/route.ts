import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { stripe, getPlanTier, getUserIdFromCustomer } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs"; // stripe SDK needs Node.js runtime

export async function POST(request: Request) {
  const body = await request.text(); // MUST be .text() not .json() for signature verification
  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromCustomer(sub.customer as string);
        if (!userId) {
          console.error("No user found for Stripe customer:", sub.customer);
          break;
        }
        // In newer Stripe SDK, current_period_start/end live on the SubscriptionItem
        const item = sub.items.data[0];
        await supabaseAdmin.from("subscriptions").upsert({
          id: sub.id,
          user_id: userId,
          status: sub.status,
          plan_tier: getPlanTier(item?.price.id),
          price_id: item?.price.id ?? null,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : null,
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        break;
      }
      case "customer.subscription.trial_will_end": {
        // 3 days before trial ends — could send a push notification in future
        // For now, log for monitoring
        const sub = event.data.object as Stripe.Subscription;
        console.log("Trial ending soon for subscription:", sub.id);
        break;
      }
      case "invoice.paid": {
        // Successful payment confirmation — subscription.updated already handles status
        break;
      }
      case "invoice.payment_failed": {
        // Payment failed — subscription.updated already handles status change to past_due
        const invoice = event.data.object as Stripe.Invoice;
        console.error("Payment failed for invoice:", invoice.id);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
