// supabase/functions/send-reminders/index.ts
// Supabase Edge Function: dispatch push notifications for shopping reminders
//
// Receives JSON body { "type": "evening" | "day_of" } from pg_cron via pg_net.
//
// Required env vars (set via `supabase secrets set`):
//   VAPID_PUBLIC_KEY  - base64url-encoded uncompressed P-256 public key point
//   VAPID_PRIVATE_KEY - base64url-encoded PKCS8 DER bytes for the P-256 private key
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// ── VAPID PUSH IMPLEMENTATION ──────────────────────────────────────────────
//
// `web-push` npm package does NOT run in Deno — it uses Node.js crypto APIs.
// We implement VAPID signing using the Web Crypto API available in Deno.
//
// Note on payload encryption: The Web Push spec requires AES-128-GCM encryption
// of the payload using the subscription's p256dh/auth keys. For v1 we send the
// payload as JSON in the request body directly (without Message Encryption).
// Some push services (FCM) accept this; others may ignore the body but still
// deliver a push event. The service worker push handler uses a fallback message
// when the payload is unavailable, so delivery still works.

// Helper: base64url encode
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper: base64url decode
function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Import VAPID private key as CryptoKey for signing.
// The key must be stored as base64url-encoded PKCS8 DER bytes.
// Generate with: npx web-push generate-vapid-keys --json
// Then convert the private key: openssl pkcs8 -topk8 -nocrypt -outform DER ... | base64url-encode
async function importVapidKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64UrlDecode(base64Key);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

// Create VAPID JWT signed with ES256
async function createVapidJWT(
  audience: string,
  subject: string,
  vapidPrivateKey: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const key = await importVapidKey(vapidPrivateKey);

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsigned)
  );

  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

// Send push notification to a single subscription endpoint.
// Returns { ok, status } so callers can handle 410 Gone (expired subscription).
async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJWT(
    audience,
    "mailto:admin@settimana-smart.app",
    vapidPrivateKey
  );

  const body = JSON.stringify(payload);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      TTL: "86400",
    },
    body,
  });

  return { ok: response.ok, status: response.status };
}

// ── SCHEDULING LOGIC ───────────────────────────────────────────────────────
// Mirrors the logic in src/lib/notifUtils.ts but reimplemented for Deno
// (no date-fns available in Edge Functions).

function getLocalDay(now: Date, timezone: string): number {
  const localStr = now.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return dayMap[localStr] ?? -1;
}

function getLocalHour(now: Date, timezone: string): number {
  return parseInt(
    now.toLocaleString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }),
    10
  );
}

function getLocalMinutes(now: Date, timezone: string): number {
  const timeStr = now.toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  // toLocaleString with hour+minute returns "HH:MM" or "H:MM"
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Returns true if now is the evening before the user's shopping day (>= 18:00 local).
function isEveningBefore(shoppingDay: number, now: Date, timezone: string): boolean {
  const dayBefore = (shoppingDay - 1 + 7) % 7; // wrap: 0 (Sun) - 1 = 6 (Sat)
  return getLocalDay(now, timezone) === dayBefore && getLocalHour(now, timezone) >= 18;
}

// Returns true if now is the shopping day within a 30-min window of notifTime.
function isDayOfTime(
  shoppingDay: number,
  notifTime: string,
  now: Date,
  timezone: string
): boolean {
  if (getLocalDay(now, timezone) !== shoppingDay) return false;
  const [h, m] = notifTime.split(":").map(Number);
  const target = h * 60 + m;
  const current = getLocalMinutes(now, timezone);
  return current >= target && current < target + 30;
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const { type } = (await req.json()) as { type: "evening" | "day_of" };
    if (type !== "evening" && type !== "day_of") {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "evening" or "day_of".' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = new Date();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Fetch all push subscriptions.
    // push_subscriptions.user_id -> auth.users(id)
    // preferences.user_id -> auth.users(id)
    // No direct FK between push_subscriptions and preferences, so use two queries.
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .not("endpoint", "is", null);

    if (subsError) throw subsError;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, expired: 0, total: 0, reason: "no subscriptions" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Batch-fetch preferences for all subscribed users.
    const userIds = [...new Set(subs.map((s) => s.user_id))];
    const { data: prefRows, error: prefError } = await supabase
      .from("preferences")
      .select("user_id, data")
      .in("user_id", userIds);

    if (prefError) throw prefError;

    // Index preferences by user_id for O(1) lookup
    const prefsByUser = Object.fromEntries(
      (prefRows ?? []).map((p) => [
        p.user_id,
        p.data as Record<string, unknown>,
      ])
    );

    let sent = 0;
    let expired = 0;
    const deletePromises: Promise<unknown>[] = [];

    for (const row of subs) {
      const prefs = prefsByUser[row.user_id];
      const shoppingDay = prefs?.shoppingDay as number | undefined;

      // Skip users who haven't configured a shopping day
      if (shoppingDay === undefined) continue;

      const timezone = (prefs?.timezone as string) || "Europe/Rome";
      const notifTime = (prefs?.shoppingNotificationTime as string) || "09:00";

      let shouldSend = false;
      let title = "";
      let body = "";
      let tag = "";

      if (type === "evening" && isEveningBefore(shoppingDay, now, timezone)) {
        shouldSend = true;
        title = "Pianifica la settimana!";
        body = "Domani e il giorno della spesa. Dai un'occhiata al piano.";
        tag = "evening-reminder";
      } else if (
        type === "day_of" &&
        isDayOfTime(shoppingDay, notifTime, now, timezone)
      ) {
        shouldSend = true;
        title = "Promemoria spesa";
        body = "E ora di fare la spesa! Apri la lista.";
        tag = "shopping-reminder";
      }

      if (!shouldSend) continue;

      const result = await sendPush(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        { title, body, tag, url: "/" },
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.ok) {
        sent++;
      } else if (result.status === 410) {
        // 410 Gone: push subscription has expired — remove it to keep the table clean
        expired++;
        deletePromises.push(
          supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", row.user_id)
            .eq("endpoint", row.endpoint)
        );
      }
    }

    // Clean up expired subscriptions concurrently
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    return new Response(
      JSON.stringify({ sent, expired, total: subs.length, type }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-reminders error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
