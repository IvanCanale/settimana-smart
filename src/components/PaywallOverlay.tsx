"use client";
import React from "react";
import type { SubscriptionStatus } from "@/types";

interface PaywallOverlayProps {
  user: { created_at: string } | null;
  subscription: SubscriptionStatus;
}

export function useIsPaywalled(user: { created_at: string } | null, subscription: SubscriptionStatus): boolean {
  if (!user) return false;
  if (subscription.tier !== "free") return false;
  if (subscription.isTrialing) return false;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((Date.now() - new Date(user.created_at).getTime()) / msPerDay);
  return daysSince >= 14;
}

export function PaywallOverlay({ user, subscription }: PaywallOverlayProps) {
  const isPaywalled = useIsPaywalled(user, subscription);
  if (!isPaywalled) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(250,248,240,0.92)",
      backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", textAlign: "center",
      borderRadius: 16,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22, fontWeight: 700,
        color: "var(--sepia, #3D2B1F)",
        margin: "0 0 12px",
      }}>
        Il tuo periodo di prova è scaduto
      </h2>
      <p style={{
        fontSize: 15, color: "var(--sepia-light, #8b7d6b)",
        maxWidth: 320, margin: "0 0 28px", lineHeight: 1.5,
      }}>
        Puoi ancora vedere il tuo piano attuale. Scegli un abbonamento per continuare a generare nuovi piani.
      </p>
      <a
        href="/abbonamento"
        style={{
          display: "inline-block",
          background: "var(--terra, #C4673A)",
          color: "white", fontWeight: 700,
          fontSize: 15, padding: "14px 32px",
          borderRadius: 10, textDecoration: "none",
          boxShadow: "0 4px 14px rgba(196,103,58,0.35)",
          transition: "all 0.18s",
        }}
      >
        Scegli un piano →
      </a>
    </div>
  );
}
