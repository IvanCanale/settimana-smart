import type { SubscriptionTier } from "@/types";

export type RigeneraEntry = {
  day: string;       // Day name, e.g. "Lun", "Mar"
  timestamp: string; // ISO 8601
};

export type RigeneraCheckResult = {
  allowed: boolean;
  reason?: "daily" | "weekly";
  dailyUsed: number;
  dailyMax: number;
  weeklyDaysUsed: number;
  weeklyDaysMax: number;
};

const DAILY_LIMIT = 2;

/**
 * Check if a user on the given tier can regenerate a meal.
 * Piano Base: max 2 regenerations per day (no weekly day cap).
 * Piano Pro / trial (tier="pro"): always allowed.
 * Free (tier="free"): always allowed (during trial they have "pro").
 */
export function canRegenerate(
  tier: SubscriptionTier,
  rigeneraLog: RigeneraEntry[],
  dayName: string,
): RigeneraCheckResult {
  // Pro and free (trial) have no limits
  if (tier !== "base") {
    return {
      allowed: true,
      dailyUsed: 0,
      dailyMax: Infinity,
      weeklyDaysUsed: 0,
      weeklyDaysMax: Infinity,
    };
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayEntries = rigeneraLog.filter(
    (e) => e.timestamp.slice(0, 10) === today
  );

  // Check daily limit only (no weekly day cap for Piano Base)
  if (todayEntries.length >= DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "daily",
      dailyUsed: todayEntries.length,
      dailyMax: DAILY_LIMIT,
      weeklyDaysUsed: 0,
      weeklyDaysMax: Infinity,
    };
  }

  return {
    allowed: true,
    dailyUsed: todayEntries.length,
    dailyMax: DAILY_LIMIT,
    weeklyDaysUsed: 0,
    weeklyDaysMax: Infinity,
  };
}

/**
 * Create a new rigenera log entry for recording a regeneration.
 */
export function createRigeneraEntry(dayName: string): RigeneraEntry {
  return { day: dayName, timestamp: new Date().toISOString() };
}
