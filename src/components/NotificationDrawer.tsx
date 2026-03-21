"use client";
import React, { useEffect } from "react";
import type { AppNotification } from "@/lib/supabase";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  loading: boolean;
  onNotificationClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}

function getWeekLabel(createdAt: string): string {
  const date = new Date(createdAt);
  // Get ISO week number
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `Settimana W${weekNum} · ${date.getFullYear()}`;
}

function getNotificationTitle(notification: AppNotification): string {
  const count = notification.payload.count as number | undefined;
  if (count === 1) return "1 nuova ricetta disponibile";
  return `${count ?? 0} nuove ricette disponibili`;
}

function getNotificationBody(notification: AppNotification): string {
  const count = notification.payload.count as number | undefined;
  return `Questa settimana sono state aggiunte ${count ?? 0} ricette al catalogo. Scoprile!`;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  loading,
  onNotificationClick,
}: NotificationDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(61,43,31,0.6)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pannello notifiche"
        className="animate-in"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(400px, 90vw)",
          background: "var(--warm-white)",
          overflowY: "auto",
          padding: 24,
          boxShadow: "-8px 0 30px rgba(61,43,31,0.15)",
          zIndex: 201,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2
            className="font-display"
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--sepia)",
            }}
          >
            Notifiche
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "var(--sepia-light)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: "grid", gap: 8 }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 72,
                  background: "var(--cream-dark)",
                  borderRadius: 12,
                  animation: "pulse 1.4s ease infinite",
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && notifications.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--sepia)" }}>
              Nessuna notifica
            </p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "var(--sepia-light)", lineHeight: 1.5 }}>
              Le novità del catalogo ricette appariranno qui ogni settimana.
            </p>
          </div>
        )}

        {/* Notification list */}
        {!loading && notifications.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                style={{
                  background: notification.read ? "rgba(61,43,31,0.03)" : "var(--cream)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  borderLeft: notification.read ? undefined : "3px solid var(--terra)",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--sepia)" }}>
                  {getNotificationTitle(notification)}
                </p>
                <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 400, color: "var(--sepia-light)", lineHeight: 1.5 }}>
                  {getNotificationBody(notification)}
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--sepia-light)" }}>
                  {getWeekLabel(notification.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
