"use client";
import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPushSupported, urlBase64ToUint8Array } from "@/lib/notifUtils";
import { savePushSubscription, deletePushSubscription } from "@/actions/pushActions";

type PermissionState = "prompt" | "granted" | "denied" | "unsupported";

export function usePushSubscription(
  userId: string | null,
  supabaseClient: SupabaseClient | null,
) {
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPermission("unsupported");
      return;
    }
    // Check current permission
    const perm = Notification.permission;
    setPermission(perm === "default" ? "prompt" : perm as PermissionState);

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => { /* service worker not available — isSubscribed stays false */ });
  }, []);

  const subscribe = useCallback(async () => {
    if (!userId || !supabaseClient || !isPushSupported()) return false;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result === "default" ? "prompt" : result as PermissionState);
      if (result !== "granted") return false;

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) return false;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY non configurata");
        return false;
      }
      // Una VAPID public key Base64URL valida è esattamente 86 caratteri (256-bit)
      if (vapidKey.length !== 86) {
        console.warn(`VAPID_PUBLIC_KEY lunghezza non valida: ${vapidKey.length} (attesa 86)`);
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });
      const subJSON = sub.toJSON();
      await savePushSubscription(session.access_token, {
        endpoint: subJSON.endpoint!,
        keys: subJSON.keys as { p256dh: string; auth: string },
      });
      setIsSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, supabaseClient]);

  const unsubscribe = useCallback(async () => {
    if (!userId || !supabaseClient) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(session.access_token, sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [userId, supabaseClient]);

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}
