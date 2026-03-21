"use client";
import React from "react";

export function TagPill({ children, terra }: { children: React.ReactNode; terra?: boolean }) {
  return <span className={`tag-pill${terra ? " tag-pill-terra" : ""}`}>{children}</span>;
}
