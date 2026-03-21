"use client";
import React, { useEffect } from "react";

export function FreezeToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 8000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, backgroundColor: "var(--sepia, #3D2B1F)", color: "white",
      padding: "1rem 1.5rem", borderRadius: "0.75rem",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: "90vw",
      display: "flex", alignItems: "center", gap: "0.75rem",
    }}>
      <span>{message}</span>
      <button onClick={onDismiss} style={{
        background: "none", border: "none", color: "white",
        cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem",
      }}>x</button>
    </div>
  );
}
