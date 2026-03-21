"use client";
import React from "react";

export function TimeTag({ minutes }: { minutes: number }) {
  return <span className="badge-time">⏱ {minutes} min</span>;
}
