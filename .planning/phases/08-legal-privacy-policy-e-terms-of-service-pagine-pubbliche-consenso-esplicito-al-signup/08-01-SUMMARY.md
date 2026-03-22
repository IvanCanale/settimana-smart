---
plan: 08-01
status: complete
---

## What was built
Two public Next.js App Router server components:
- `src/app/privacy/page.tsx` — Italian Privacy Policy at /privacy
- `src/app/terms/page.tsx` — Italian Terms of Service at /terms

## Key decisions
- Server components (no "use client") — static pages, no interactivity needed
- maxWidth: 680px for readability (wider than onboarding cards at 480px)
- Using existing design system tokens: .bg-texture, .card-warm, .font-display, var(--terra), var(--sepia), var(--sepia-light)
- 8 sections each in Italian with all required GDPR content
- mailto links for privacy@settimana-smart.app

## Artifacts
- src/app/privacy/page.tsx
- src/app/terms/page.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- src/app/privacy/page.tsx: FOUND
- src/app/terms/page.tsx: FOUND
- Commit afedae4: FOUND
