"use client";
import React from "react";

export function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
      <div className="section-icon"><span style={{ fontSize: 18 }}>{icon}</span></div>
      <div>
        <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, color: "var(--sepia)", margin: 0, lineHeight: 1.3 }}>{title}</h3>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--sepia-light)", fontWeight: 400 }}>{subtitle}</p>}
      </div>
    </div>
  );
}
