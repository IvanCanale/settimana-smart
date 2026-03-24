"use server";

import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:admin@menumix.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) throw new Error(`Failed to save subscription: ${error.message}`);
  return { ok: true };
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  return { ok: true };
}
