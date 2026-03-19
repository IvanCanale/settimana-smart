# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - Database, authentication, and user data persistence
  - SDK/Client: `@supabase/supabase-js` 2.49.4
  - Client init: `src/lib/AuthProvider.tsx` (created client-side via `createClient`)
  - DB utility functions: `src/lib/supabase.ts`
  - Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public env vars)
  - Supabase API calls are explicitly excluded from service worker cache (`public/sw.js`)

**Fonts:**
- Google Fonts - `Playfair Display` and `DM Sans` loaded via CSS `@import` in `src/app/page.tsx`
  - No API key required; loaded at runtime via browser

## Data Storage

**Databases:**
- Supabase (PostgreSQL under the hood)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Client: `@supabase/supabase-js` `SupabaseClient` (passed as parameter to utility functions)
  - Tables accessed:
    - `preferences` — columns: `user_id`, `data` (JSONB); upsert on `user_id`
    - `pantry` — columns: `user_id`, `items` (JSONB array); upsert on `user_id`
    - `weekly_plan` — columns: `user_id`, `seed`, `manual_overrides`, `learning`; upsert on `user_id`

**Local Storage (browser):**
- Used as primary persistence when user is not authenticated
- Keys: `ss_preferences_v1`, `ss_pantry_v1`, `ss_seed_v1`, `ss_manual_overrides_v1`, `ss_learning_v1`
- Migration path exists: `migrateFromLocalStorage()` in `src/lib/supabase.ts` reads all local keys and writes to Supabase on sign-in

**File Storage:**
- Not used — no cloud file storage integration

**Caching:**
- Browser-level via Service Worker (`public/sw.js`)
  - Cache name: `settimana-smart-v1`
  - Strategy: network-first with cache fallback for GET requests
  - Excludes: any URL containing `supabase.co`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: React context (`AuthContext`) in `src/lib/AuthProvider.tsx`
  - Session retrieval: `client.auth.getSession()` on mount
  - Session persistence: `client.auth.onAuthStateChange()` subscription
  - Auth is optional: when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, `sbClient` remains `null` and the app operates in local-only mode
  - Auth modal: controlled via `showAuthModal` state in context; UI not yet fully implemented

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Datadog, or similar SDK present

**Logs:**
- No structured logging library; standard `console` only

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured; Vercel assets (`vercel.svg`, `next.svg`) in `public/` suggest intended Vercel deployment
- PWA manifest (`public/manifest.json`) indicates installable progressive web app target

**CI Pipeline:**
- Not detected — no GitHub Actions, CircleCI, or similar config files found

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public, safe to expose to browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (public, safe to expose to browser)

**Secrets location:**
- `.env.local.txt` present at project root (non-standard extension; Next.js auto-loads `.env.local`, not `.env.local.txt` — this file may need to be renamed)
- No server-side secret keys detected

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected — Supabase is queried directly via client SDK, not via webhooks

---

*Integration audit: 2026-03-19*
