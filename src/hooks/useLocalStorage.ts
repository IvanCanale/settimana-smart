"use client";
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return fallback;
    try {
      const saved = localStorage.getItem(key);
      return saved
        ? (typeof fallback === "object" && fallback !== null
            ? { ...fallback, ...JSON.parse(saved) }
            : JSON.parse(saved)) as T
        : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* localStorage pieno o non disponibile */ }
  }, [key, value]);

  return [value, setValue];
}
