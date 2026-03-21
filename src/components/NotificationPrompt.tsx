"use client";
import React from "react";
import type { usePushSubscription } from "@/hooks/usePushSubscription";

type PushState = ReturnType<typeof usePushSubscription>;

interface NotificationPromptProps {
  push: PushState;
}

export function NotificationPrompt({ push }: NotificationPromptProps) {
  if (push.permission === "unsupported") {
    return (
      <div style={{
        background: "var(--cream)",
        borderRadius: 12,
        padding: 16,
        fontSize: 13,
        color: "var(--sepia-light)",
        lineHeight: 1.5,
      }}>
        Le notifiche push non sono supportate su questo dispositivo.
        Per riceverle, aggiungi l&apos;app alla schermata Home.
      </div>
    );
  }

  if (push.permission === "denied") {
    return (
      <div style={{
        background: "var(--cream)",
        borderRadius: 12,
        padding: 16,
        fontSize: 13,
        color: "var(--sepia-light)",
        lineHeight: 1.5,
      }}>
        Le notifiche sono state bloccate. Puoi riattivarle dalle impostazioni del browser.
      </div>
    );
  }

  if (push.isSubscribed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "var(--olive)", fontWeight: 600 }}>
          Notifiche attive
        </span>
        <button
          onClick={() => push.unsubscribe()}
          disabled={push.loading}
          style={{
            background: "none",
            border: "1px solid rgba(61,43,31,0.2)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
            color: "var(--sepia-light)",
          }}
        >
          Disattiva
        </button>
      </div>
    );
  }

  // Default: prompt state — show call-to-action
  return (
    <div style={{
      background: "rgba(196,103,58,0.06)",
      borderRadius: 12,
      padding: 16,
      border: "1px solid rgba(196,103,58,0.15)",
    }}>
      <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--sepia)" }}>
        Promemoria spesa
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--sepia-light)", lineHeight: 1.5 }}>
        Ricevi un promemoria la sera prima e il giorno della spesa.
      </p>
      <button
        onClick={() => push.subscribe()}
        disabled={push.loading}
        className="btn-terra"
        style={{
          justifyContent: "center",
          width: "100%",
          fontSize: 14,
          transition: "all 0.15s",
          opacity: push.loading ? 0.6 : 1,
        }}
      >
        {push.loading ? "Attivazione..." : "Attiva notifiche"}
      </button>
    </div>
  );
}
