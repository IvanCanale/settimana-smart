"use client";
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return fallback;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
      if (typeof fallback === "object" && fallback !== null) return { ...fallback, ...parsed } as T;
      return parsed as T;
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
