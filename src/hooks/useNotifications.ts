"use client";
import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchNotifications, markNotificationRead } from "@/lib/supabase";
import type { AppNotification } from "@/lib/supabase";

export function useNotifications(sbClient: SupabaseClient | null, userId?: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Aspetta sia il client che l'utente autenticato (userId garantisce sessione attiva)
    if (!sbClient || !userId) return;
    setLoading(true);
    fetchNotifications(sbClient)
      .then(setNotifications)
      .catch(() => console.warn("Failed to fetch notifications"))
      .finally(() => setLoading(false));
  }, [sbClient, userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    // Update local state immediately (optimistic)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Sync to Supabase if available e utente autenticato
    if (!sbClient || !userId) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(sbClient, n.id)))
      .catch((err) => console.warn("markAllRead sync failed:", err));
  }, [sbClient, userId, notifications]);

  return { notifications, loading, unreadCount, markAllRead };
}
