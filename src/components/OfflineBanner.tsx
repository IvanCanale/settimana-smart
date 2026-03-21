"use client";
import { WifiOff } from "lucide-react";

interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div
      className="alert-banner animate-in"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        fontSize: 14,
        fontWeight: 400,
        color: "var(--sepia)",
        background: "rgba(196,103,58,0.08)",
        border: "1px solid rgba(196,103,58,0.2)",
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <WifiOff size={16} style={{ color: "var(--terra)", flexShrink: 0 }} />
      <span>Modalita offline &mdash; modifiche salvate localmente</span>
    </div>
  );
}
