import { getDay } from "date-fns";

/** Check if push notifications are supported in this browser context */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("PushManager" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSSafari = /iP(hone|ad)/.test(navigator.userAgent);
  if (isIOSSafari && !isStandalone) return false;
  return true;
}

/** Convert base64url VAPID key to Uint8Array for applicationServerKey */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Check if now is the evening before the user's shopping day.
 * "Evening" = after 18:00 local time on the day before shoppingDay.
 * shoppingDay uses JS getDay() convention: 0=Sun, 1=Mon, ..., 6=Sat.
 * timezone: IANA string (default "Europe/Rome").
 */
export function isEveningBeforeShoppingDay(
  shoppingDay: number,
  now: Date = new Date(),
  timezone: string = "Europe/Rome"
): boolean {
  const localStr = now.toLocaleString("en-US", { timeZone: timezone });
  const local = new Date(localStr);
  const dayBefore = (shoppingDay - 1 + 7) % 7; // wrap Sunday-1 = Saturday
  return getDay(local) === dayBefore && local.getHours() >= 18;
}

/**
 * Check if now is on the shopping day within 30 min of the user's chosen notification time.
 * notifTime: "HH:MM" string.
 */
export function isDayOfShoppingTime(
  shoppingDay: number,
  notifTime: string,
  now: Date = new Date(),
  timezone: string = "Europe/Rome"
): boolean {
  const localStr = now.toLocaleString("en-US", { timeZone: timezone });
  const local = new Date(localStr);
  if (getDay(local) !== shoppingDay) return false;
  const [h, m] = notifTime.split(":").map(Number);
  const targetMinutes = h * 60 + m;
  const currentMinutes = local.getHours() * 60 + local.getMinutes();
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 30;
}
