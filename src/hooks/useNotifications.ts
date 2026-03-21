"use client";
import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchNotifications, markNotificationRead } from "@/lib/supabase";
import type { AppNotification } from "@/lib/supabase";

export function useNotifications(sbClient: SupabaseClient | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sbClient) return;
    setLoading(true);
    fetchNotifications(sbClient)
      .then(setNotifications)
      .catch(() => console.warn("Failed to fetch notifications"))
      .finally(() => setLoading(false));
  }, [sbClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    if (!sbClient) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(sbClient, n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [sbClient, notifications]);

  return { notifications, loading, unreadCount, markAllRead };
}
