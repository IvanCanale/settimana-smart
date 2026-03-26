"use client";
import React from "react";
import type { SubscriptionStatus } from "@/types";

interface TrialBannerProps {
  user: { created_at: string } | null;
  subscription: SubscriptionStatus;
}

export function TrialBanner({ user, subscription }: TrialBannerProps) {
  if (!user) return null;
  if (subscription.status === "active" && !subscription.isTrialing) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  let daysLeft: number;

  if (subscription.isTrialing && subscription.trialEnd) {
    daysLeft = Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / msPerDay));
  } else {
    const daysSince = Math.floor((Date.now() - new Date(user.created_at).getTime()) / msPerDay);
    daysLeft = Math.max(0, 14 - daysSince);
  }

  if (daysLeft === 0) return null;

  const daysUsed = 14 - daysLeft;
  const progress = Math.min(100, (daysUsed / 14) * 100);
  const isUrgent = daysLeft <= 3;

  return (
    <div style={{
      margin: "10px 12px 4px",
      background: "var(--warm-white)",
      border: `1.5px solid ${isUrgent ? "var(--terra-light)" : "var(--cream-dark)"}`,
      borderRadius: 12,
      padding: "11px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Icona */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: isUrgent ? "rgba(196,103,58,0.12)" : "var(--cream-dark)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}>
        {isUrgent ? "🔥" : "⏳"}
      </div>

      {/* Testo + barra */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: isUrgent ? "var(--terra)" : "var(--sepia)",
          letterSpacing: 0.2,
          marginBottom: 2,
        }}>
          {daysLeft === 1
            ? "Ultimo giorno di prova"
            : `Prova gratuita — ${daysLeft} giorni rimasti`}
        </div>
        {/* Barra progresso */}
        <div style={{
          height: 4,
          background: "var(--cream-dark)",
          borderRadius: 99,
          overflow: "hidden",
          marginBottom: 1,
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: isUrgent ? "var(--terra)" : "var(--olive-light)",
            borderRadius: 99,
            transition: "width 0.3s ease",
          }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--sepia-light)" }}>
          {daysUsed} di 14 giorni utilizzati
        </div>
      </div>

      {/* CTA */}
      <a
        href="/abbonamento"
        style={{
          flexShrink: 0,
          background: isUrgent ? "var(--terra)" : "var(--olive)",
          color: "white",
          fontSize: 12,
          fontWeight: 700,
          padding: "7px 12px",
          borderRadius: 8,
          textDecoration: "none",
          whiteSpace: "nowrap",
          letterSpacing: 0.1,
        }}
      >
        Abbonati
      </a>
    </div>
  );
}
