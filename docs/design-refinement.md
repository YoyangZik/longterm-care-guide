# Design refinement · 2026-11-03

Presentation-only refresh: warm ivory/forest palette, restrained typography, unified vector icons, compact tab selection, grouped preparation rows, record entry cards, calendar and input surfaces.

Existing storage, models, navigation destinations, state transitions, event handlers and input validation preserved. No dependency/config changes. Before/after AST comparison confirms all JSX on* handlers and disabled/editable/value/maxLength props are unchanged.

Changed files:
- src/components/action-controls.tsx
- src/components/brand-visuals.tsx
- src/components/icon-button.tsx
- src/components/month-grid.tsx
- src/components/selection-row.tsx
- src/design/styles.ts
- src/design/tokens.ts
- src/app/(tabs)/_layout.tsx
- src/features/home/home-screen.tsx
- src/features/preparation/checklist.tsx
- src/features/preparation/presentation.tsx
- src/features/records/interview.tsx
- src/features/records/records-browser.tsx
- src/features/records/records-screen.tsx
- src/features/records/situation-screen.tsx

Validation: TypeScript and Expo lint passed; 87 existing regression tests passed. Browser visual review at 390×844; native iOS/Android rendering and OS font scaling still require device verification.
