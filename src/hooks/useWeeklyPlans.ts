import { useState, useEffect, useCallback } from "react";
import { currentWeekISO, nextWeekISO, isWeekExpired } from "@/lib/weekUtils";
import { loadWeeklyPlans, saveWeeklyPlan } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanStatus, WeeklyPlanRecord } from "@/types";

export function useWeeklyPlans(
  sbClient: SupabaseClient | null,
  userId: string | null
) {
  const [activeWeek, setActiveWeek] = useState<string>(currentWeekISO());
  const [plans, setPlans] = useState<WeeklyPlanRecord[]>([]);
  const [feedbackNote, setFeedbackNote] = useState("");

  // Load plans from Supabase on mount and archive expired ones
  useEffect(() => {
    if (!sbClient || !userId) return;
    loadWeeklyPlans(sbClient, userId).then(loaded => {
      // Archive expired plans
      const now = new Date();
      const updated = loaded.map(p =>
        p.status === "active" && isWeekExpired(p.week_iso, now)
          ? { ...p, status: "archived" as PlanStatus }
          : p
      );
      setPlans(updated);
      // Persist archival transitions
      updated.filter((p, i) => p.status !== loaded[i].status).forEach(p => {
        saveWeeklyPlan(sbClient, userId, {
          week_iso: p.week_iso,
          status: p.status,
          seed: p.seed,
          manualOverrides: p.manual_overrides as Record<string, unknown>,
          learning: p.learning as Record<string, unknown>,
          feedback_note: p.feedback_note,
          checked_items: p.checked_items,
        });
      });
    }).catch(() => { /* offline — plans from localStorage */ });
  }, [sbClient, userId]);

  const currentPlan = plans.find(p => p.week_iso === currentWeekISO());
  const nextPlan = plans.find(p => p.week_iso === nextWeekISO());
  const isViewingNextWeek = activeWeek === nextWeekISO();

  const switchWeek = useCallback((week: string) => {
    setActiveWeek(week);
  }, []);

  return {
    activeWeek,
    switchWeek,
    currentPlan,
    nextPlan,
    isViewingNextWeek,
    feedbackNote,
    setFeedbackNote,
    plans,
  };
}
