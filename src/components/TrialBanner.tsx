"use client";
import React from "react";
import type { SubscriptionStatus } from "@/types";

interface TrialBannerProps {
  user: { created_at: string } | null;
  subscription: SubscriptionStatus;
}

export function TrialBanner({ user, subscription }: TrialBannerProps) {
  if (!user) return null;
  // Non mostrare se ha già un abbonamento attivo (non in trial)
  if (subscription.status === "active" && !subscription.isTrialing) return null;
  if (subscription.tier !== "free" && !subscription.isTrialing) return null;

  // Calcola giorni rimanenti
  const msPerDay = 1000 * 60 * 60 * 24;
  let daysLeft: number;

  if (subscription.isTrialing && subscription.trialEnd) {
    daysLeft = Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / msPerDay));
  } else {
    const daysSince = Math.floor((Date.now() - new Date(user.created_at).getTime()) / msPerDay);
    daysLeft = Math.max(0, 14 - daysSince);
  }

  if (daysLeft === 0) return null;

  const label = daysLeft === 1 ? "ultimo giorno" : `scade tra ${daysLeft} giorni`;

  return (
    <a
      href="/abbonamento"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "var(--terra, #C4673A)",
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        padding: "9px 16px",
        textDecoration: "none",
        textAlign: "center",
        letterSpacing: 0.1,
      }}
    >
      <span>⏳</span>
      <span>Periodo di prova — {label} · <u>Scegli un piano</u></span>
    </a>
  );
}
