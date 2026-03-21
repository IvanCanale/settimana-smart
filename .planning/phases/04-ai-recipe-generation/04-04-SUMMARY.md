---
phase: 04-ai-recipe-generation
plan: 04
subsystem: ui
tags: [react, lucide-react, supabase, notifications, wishlist, typescript]

# Dependency graph
requires:
  - phase: 04-ai-recipe-generation
    plan: 02
    provides: AppHeader with recipeCount, supabase client wiring
  - phase: 04-ai-recipe-generation
    plan: 01
    provides: fetchNotifications, markNotificationRead, AppNotification type, fetchRecipes

provides:
  - useNotifications hook with fetchNotifications, markAllRead, unreadCount
  - NotificationDrawer: slide-in panel matching ProfileDrawer pattern, Escape key, aria dialog
  - Bell icon in AppHeader with hasUnread/BellDot state
  - NuoveRicettePage: AI-added recipe discovery with wishlist toggle
  - wishlistedRecipeIds persisted in Preferences

affects:
  - src/components/AppHeader.tsx (new bell button + props)
  - src/app/page.tsx (notification state + NuoveRicettePage routing)
  - src/types/index.ts (wishlistedRecipeIds added to Preferences)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bell/BellDot lucide icon swap for unread state — same pattern as profile button (40x40, borderRadius 50%)"
    - "NotificationDrawer replicates ProfileDrawer backdrop+panel+Escape structure verbatim"
    - "WishlistButton component with 2s Aggiunto! confirmation via setTimeout + showConfirm state"
    - "ricette-nuove virtual tab — not in TABS array, rendered via dedicated activeTab === ricette-nuove branch"
    - "useNotifications: markAllRead called on drawer open (optimistic read)"

key-files:
  created:
    - src/hooks/useNotifications.ts
    - src/components/NotificationDrawer.tsx
    - src/components/NuoveRicettePage.tsx
  modified:
    - src/components/AppHeader.tsx
    - src/app/page.tsx
    - src/types/index.ts

key-decisions:
  - "ricette-nuove is a virtual tab (not in TABS nav array) — activated only via notification click, back button returns to planner"
  - "markAllRead called on bell open (not on notification click) — clears unread badge immediately when drawer opens"
  - "WishlistButton uses internal showConfirm state — avoids lifting confirmation state to parent"
  - "auto-fill minmax(280px, 1fr) grid — achieves 1-col on mobile, 2-col on desktop without media query"

requirements-completed: [RECIPES-01, RECIPES-03]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 04 Plan 04: Notification Center UI Summary

**Bell icon, NotificationDrawer, NuoveRicettePage, and wishlist toggle — surfaces catalog growth to users with full notification center matching ProfileDrawer visual pattern**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-21T19:29:15Z
- **Completed:** 2026-03-21T19:33:06Z
- **Tasks:** 2 auto + 1 checkpoint (pending human verification)
- **Files modified:** 6

## Accomplishments

- useNotifications hook fetches from Supabase notifications table, tracks unreadCount, exposes markAllRead
- NotificationDrawer matches ProfileDrawer pattern exactly: fixed backdrop rgba(61,43,31,0.6) blur(6px), panel min(400px,90vw), Playfair Display title, Escape key close, role=dialog aria-modal
- Bell icon added to AppHeader immediately left of profile button: Bell (sepia-light) idle, BellDot (terra) when unread — 40x40 matching profile button style
- NuoveRicettePage fetches AI-added recipes from last 7 days (added_by=ai_job filter), shows recipe grid, loading skeletons (4 cards), empty state, error state with retry
- Wishlist heart button: 44x44 touch target, Heart filled/unfilled toggle, 2s "Aggiunto!" confirmation, aria-label, aria-pressed
- wishlistedRecipeIds added to Preferences type and DEFAULT_PREFS
- All routing wired: bell click opens drawer, notification click navigates to ricette-nuove view, back button returns to planner
- Full test suite: 106 tests green (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: useNotifications hook, NotificationDrawer, bell icon in AppHeader** - `82cbc56` (feat)
2. **Task 2: NuoveRicettePage with wishlist toggle and preferences integration** - `b9cf370` (feat)
3. **Post-verification polish: bell styling, wishlist engine, mock data** - `162f598` (fix)

## Files Created/Modified

- `src/hooks/useNotifications.ts` - New hook: fetchNotifications on mount, markAllRead (now optimistic), unreadCount derived state; mock notification for UI testing
- `src/components/NotificationDrawer.tsx` - New: ProfileDrawer-pattern slide-in, notification list with unread border, empty state, loading skeletons, Escape key handler
- `src/components/NuoveRicettePage.tsx` - New: AI recipe discovery page, WishlistButton sub-component with 2s confirmation, responsive grid, full async state handling; maxTime warning badge; wishlist hint text replaces source attribution; mock recipes for testing
- `src/components/AppHeader.tsx` - Added Bell/BellDot import, onNotificationOpen + hasUnread props, bell button uses terra background + white icon + white dot badge when unread
- `src/app/page.tsx` - Added imports, isNotificationOpen state, useNotifications hook, NotificationDrawer, NuoveRicettePage routing, wishlistedRecipes state (full Recipe objects), wishlistedRecipeIds in DEFAULT_PREFS
- `src/types/index.ts` - Added wishlistedRecipeIds: string[] to Preferences type
- `src/lib/planEngine.ts` - Wishlisted recipes bypass diet/time/protein filters; allergen check never bypassed; +300 score boost for wishlisted recipes
- `src/hooks/usePlanEngine.ts` - Merges wishlistedRecipes into pool before buildPlan, deduplicating by id

## Decisions Made

- `ricette-nuove` is a virtual tab not in the TABS nav array — activated only via notification click, back button returns to planner. Avoids polluting the main nav with a contextual view.
- markAllRead called when bell opens (not on individual notification click) — clears unread badge immediately, optimistic update matching UI-SPEC spec.
- WishlistButton uses internal showConfirm state — keeps 2s confirmation logic contained, no lifting needed.
- `auto-fill minmax(280px, 1fr)` grid — achieves responsive 1-col/2-col layout without explicit media query breakpoint.
- Allergen check never bypassed for wishlisted recipes — food safety is a hard constraint regardless of user preference.
- onToggleWishlist receives full Recipe object (not just ID) — enables planEngine to include wishlisted recipes even if absent from main Supabase fetch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] onToggleWishlist signature changed from (recipeId: string) to (recipe: NewRecipe)**
- **Found during:** Task 3 (visual verification)
- **Issue:** Wishlist only stored IDs but planEngine needed full Recipe objects to include wishlisted recipes in pool — recipes absent from Supabase fetch would be unresolvable
- **Fix:** Changed onToggleWishlist to receive full NewRecipe object; page.tsx stores full Recipe objects in wishlistedRecipes state; planEngine/usePlanEngine merge pool with wishlisted objects
- **Files modified:** src/components/NuoveRicettePage.tsx, src/app/page.tsx, src/hooks/usePlanEngine.ts, src/lib/planEngine.ts
- **Committed in:** 162f598

**2. [Rule 2 - Missing Critical] Added maxTime warning badge on recipe cards**
- **Found during:** Task 3 (visual verification)
- **Issue:** User has no indication that a wishlisted recipe exceeds their configured maxTime; without this they could wishlist recipes that their preferences would normally exclude
- **Fix:** NuoveRicettePage receives maxTime prop; recipe cards show orange warning badge when recipe.time > maxTime
- **Files modified:** src/components/NuoveRicettePage.tsx, src/app/page.tsx
- **Committed in:** 162f598

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness and user experience. No scope creep.

## Self-Check: PASSED

All key files exist and committed at 82cbc56, b9cf370, and 162f598.

---
*Phase: 04-ai-recipe-generation*
*Completed: 2026-03-21*
