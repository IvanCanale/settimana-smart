"use server";

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { verifyAccessToken } from "@/lib/serverAuth";

webpush.setVapidDetails(
  "mailto:admin@menumix.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function savePushSubscription(
  accessToken: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  const user = await verifyAccessToken(accessToken);
  if (!user) throw new Error("Non autorizzato");

  // Validate endpoint is a valid HTTPS URL
  try {
    const url = new URL(subscription.endpoint);
    if (url.protocol !== "https:") throw new Error("Endpoint must be HTTPS");
  } catch {
    throw new Error("Endpoint push non valido");
  }

  const supabase = adminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) throw new Error(`Failed to save subscription: ${error.message}`);
  return { ok: true };
}

export async function deletePushSubscription(
  accessToken: string,
  endpoint: string
) {
  const user = await verifyAccessToken(accessToken);
  if (!user) throw new Error("Non autorizzato");

  const supabase = adminClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  return { ok: true };
}
