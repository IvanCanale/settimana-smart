---
plan: 08-02
status: complete
---

## What was built
Consent checkbox added to Step 4 (registration) of OnboardingFlow.

## Key decisions
- `consentAccepted` state (boolean, default false) added alongside existing `showAuthInline`
- Checkbox gates only "Crea account o accedi" button — "Continua senza account →" is unaffected
- Visual feedback: label background and border change color when checked
- Links to /privacy and /terms open in new tabs (target="_blank")
- Client-side only — no server storage needed

## Artifacts
- src/components/OnboardingFlow.tsx (modified)
