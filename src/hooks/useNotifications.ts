"use client";
import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchNotifications, markNotificationRead } from "@/lib/supabase";
import type { AppNotification } from "@/lib/supabase";

export function useNotifications(sbClient: SupabaseClient | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // MOCK temporaneo — rimuovere dopo verifica UI
    setNotifications([{
      id: "test-1",
      type: "new_recipes",
      payload: { count: 5 },
      created_at: new Date().toISOString(),
      read: false,
    }]);
    return;
    if (!sbClient) return;
    setLoading(true);
    fetchNotifications(sbClient)
      .then(setNotifications)
      .catch(() => console.warn("Failed to fetch notifications"))
      .finally(() => setLoading(false));
  }, [sbClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    // Update local state immediately (optimistic)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Sync to Supabase if available
    if (!sbClient) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(sbClient, n.id)));
  }, [sbClient, notifications]);

  return { notifications, loading, unreadCount, markAllRead };
}
