import { getISOWeek, getISOWeekYear, addWeeks } from "date-fns";

export function currentWeekISO(now = new Date()): string {
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function nextWeekISO(now = new Date()): string {
  return currentWeekISO(addWeeks(now, 1));
}

export function isWeekExpired(weekISO: string, now = new Date()): boolean {
  return weekISO < currentWeekISO(now);
}
