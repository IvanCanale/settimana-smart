"use client";
import { useState, useEffect, useCallback } from "react";
import { isPushSupported, urlBase64ToUint8Array } from "@/lib/notifUtils";
import { savePushSubscription, deletePushSubscription } from "@/actions/pushActions";

type PermissionState = "prompt" | "granted" | "denied" | "unsupported";

export function usePushSubscription(userId: string | null) {
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
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!userId || !isPushSupported()) return false;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result === "default" ? "prompt" : result as PermissionState);
      if (result !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ) as unknown as BufferSource,
      });
      const subJSON = sub.toJSON();
      await savePushSubscription(userId, {
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
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(userId, sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}
