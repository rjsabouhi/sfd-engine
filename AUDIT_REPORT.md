# SFD Engine Pre-Export Audit Report
Generated: January 13, 2026

## Summary

| Category | Status |
|----------|--------|
| TypeScript Compilation | PASS |
| Production Build | PASS |
| Runtime Errors | NONE |
| Bundle Size | 889KB JS (260KB gzipped) |

---

## A. Orphaned/Unused Components (Candidates for Removal)

### Custom Components (Never Imported)
| Component | File | Recommendation |
|-----------|------|----------------|
| DiagnosticPanel | diagnostic-panel.tsx | May be dynamically loaded - verify before removing |
| ExportPanel | export-panel.tsx | Superseded by FloatingExportDialog - SAFE TO REMOVE |
| MetricsPanel | metrics-panel.tsx | SAFE TO REMOVE |
| NotebookMode | notebook-mode.tsx | SAFE TO REMOVE |
| PresetMenu | preset-menu.tsx | SAFE TO REMOVE |
| StatisticsPanel | statistics-panel.tsx | SAFE TO REMOVE |
| ThemeToggle | theme-toggle.tsx | SAFE TO REMOVE |

### Unused UI Components (24 total - from shadcn/ui)
These are standard UI primitives that came with the template but are not currently used:
- accordion, alert-dialog, alert, aspect-ratio, avatar, breadcrumb
- calendar, carousel, chart, checkbox, command, context-menu
- drawer, form, hover-card, input-otp, navigation-menu, pagination
- popover, progress, sidebar, table, textarea, toggle-group

**Recommendation:** Keep for potential future use OR remove if minimizing bundle size is critical.

---

## B. Unused Exported Functions

| Function | File | Recommendation |
|----------|------|----------------|
| isTransitionActive | apply-preset.ts | SAFE TO REMOVE |
| getDefaultModeLabels | interpretation-modes.ts | SAFE TO REMOVE |
| getMetricsLabel | language.ts | SAFE TO REMOVE |
| getModeDescription | language.ts | SAFE TO REMOVE |
| getModeName | language.ts | SAFE TO REMOVE |
| getRegimeName | language.ts | SAFE TO REMOVE |
| getRegimeNarrative | language.ts | SAFE TO REMOVE |
| getRegimeWatchFor | language.ts | SAFE TO REMOVE |
| getOnboardingBody | language.ts | SAFE TO REMOVE |
| getMetricText | language.ts | SAFE TO REMOVE |
| getMetricLabel | language.ts | SAFE TO REMOVE |
| getRegimeText | language.ts | SAFE TO REMOVE |
| getRegimeLabel | language.ts | SAFE TO REMOVE |
| setPanelState | panel-state-store.ts | SAFE TO REMOVE |
| getAllPanelStates | panel-state-store.ts | SAFE TO REMOVE |
| resetPanelState | panel-state-store.ts | SAFE TO REMOVE |

---

## C. Console.log Statements (Debug Code)

### export-utils.ts (12 statements)
- Lines 18, 30, 44, 60, 82, 88, 92, 1273, 1319, 1349, 1358, 1590
- Purpose: Export/recording debugging
- **Recommendation:** Remove or wrap in DEBUG flag

### simulation.tsx (9 statements)
- Lines 463, 787, 894, 897, 920, 958, 1073, 1075, 1077
- Purpose: Recording/sharing debugging
- **Recommendation:** Remove or wrap in DEBUG flag

---

## D. TODO Comments

| File | Line | Comment |
|------|------|---------|
| welcome-modal.tsx | 10 | "TODO: Restore localStorage check after testing" |

---

## E. Attached Assets Analysis

**Total files in attached_assets/:** 120+ files
**Actually used in codebase:** 1 file
- `attached_assets/generated_images/3x3_grid_shimmer_logo.png` (used in simulation.tsx and fullscreen-menubar.tsx)

**Recommendation:** 
- Keep only `attached_assets/generated_images/3x3_grid_shimmer_logo.png`
- Remove all other files (user-uploaded reference images, pasted text files)

---

## F. Build Artifacts & Dev Files

### Must EXCLUDE from export:
| Path | Reason |
|------|--------|
| node_modules/ | NPM dependencies |
| dist/ | Build output |
| .cache/ | Build cache |
| .replit | Replit config |
| .config/ | Editor config |
| .upm/ | Package manager cache |
| *.log | Log files |

### Must INCLUDE in export:
| Path | Purpose |
|------|---------|
| client/ | Frontend source |
| server/ | Backend source |
| shared/ | Shared types |
| package.json | Dependencies |
| tsconfig.json | TypeScript config |
| vite.config.ts | Vite config |
| tailwind.config.ts | Tailwind config |
| postcss.config.js | PostCSS config |
| drizzle.config.ts | Database config |
| components.json | shadcn/ui config |
| attached_assets/generated_images/3x3_grid_shimmer_logo.png | Logo asset |

---

## G. Build Warnings

### PostCSS Warning (Non-critical)
```
A PostCSS plugin did not pass the `from` option to `postcss.parse`.
```
**Impact:** Minor - may affect source maps but not functionality
**Action:** No action required

### Bundle Size Warning
```
Some chunks are larger than 500 kB after minification.
```
**Current size:** 889KB (260KB gzipped)
**Recommendation:** Consider code-splitting if bundle size becomes an issue

---

## H. Runtime Observations

- Server starts cleanly on port 5000
- No undefined accesses detected
- No NaN errors in simulation loop
- No uninitialized state errors
- No React effect failures
- Browser console shows only Vite HMR messages (no errors)

---

## I. Recommended Actions

### High Priority (Before Export)
1. Remove unused component files if bundle size is a concern
2. Clean up console.log statements for production
3. Remove unused attached_assets (saves ~50MB+)

### Medium Priority
1. Remove unused exported functions from lib files
2. Address TODO comment in welcome-modal.tsx
3. Consider code-splitting for large bundle

### Low Priority (Can Keep)
1. Unused shadcn/ui components (they tree-shake well)
2. DiagnosticPanel (may be dynamically loaded via CTRL+SHIFT+D)

---

## J. Export-Ready Checklist

- [x] TypeScript compiles without errors
- [x] Production build succeeds
- [x] No runtime errors detected
- [x] All referenced assets exist
- [ ] Console.log statements removed (optional)
- [ ] Unused components removed (optional)
- [x] Dev artifacts will be excluded

---

## K. Export Package Contents

```
sfd-engine/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── index.html
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── vite.ts
├── shared/
│   └── schema.ts
├── script/
│   └── build.ts
├── attached_assets/
│   └── generated_images/
│       └── 3x3_grid_shimmer_logo.png
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── drizzle.config.ts
├── components.json
└── README.md (if exists)
```

---

## Confirmation

**Export Readiness:** APPROVED

The SFD Engine is ready for export with the current codebase. All critical checks pass. Optional cleanup items have been identified for consideration.
