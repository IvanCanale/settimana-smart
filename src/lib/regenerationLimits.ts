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
const WEEKLY_DAYS_LIMIT = 3;

/**
 * Check if a user on the given tier can regenerate a meal.
 * Piano Base: max 2 regenerations per day, max 3 unique days per week.
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

  // Check daily limit
  if (todayEntries.length >= DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "daily",
      dailyUsed: todayEntries.length,
      dailyMax: DAILY_LIMIT,
      weeklyDaysUsed: 0,
      weeklyDaysMax: WEEKLY_DAYS_LIMIT,
    };
  }

  // Check weekly unique days limit
  // A "week" is defined by entries sharing the same ISO week (Mon-Sun)
  const uniqueDays = new Set(rigeneraLog.map((e) => e.day));
  // If this day is already in the set, no new day is consumed
  if (!uniqueDays.has(dayName) && uniqueDays.size >= WEEKLY_DAYS_LIMIT) {
    return {
      allowed: false,
      reason: "weekly",
      dailyUsed: todayEntries.length,
      dailyMax: DAILY_LIMIT,
      weeklyDaysUsed: uniqueDays.size,
      weeklyDaysMax: WEEKLY_DAYS_LIMIT,
    };
  }

  return {
    allowed: true,
    dailyUsed: todayEntries.length,
    dailyMax: DAILY_LIMIT,
    weeklyDaysUsed: uniqueDays.size,
    weeklyDaysMax: WEEKLY_DAYS_LIMIT,
  };
}

/**
 * Create a new rigenera log entry for recording a regeneration.
 */
export function createRigeneraEntry(dayName: string): RigeneraEntry {
  return { day: dayName, timestamp: new Date().toISOString() };
}
