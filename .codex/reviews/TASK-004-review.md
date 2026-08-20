---
id: TASK-004-review
reviewed-by: WorkBuddy
date: 2026-08-20
status: APPROVED
required-changes: 0
info-notes: 3
low-notes: 2
---

# TASK-004 Review — Editor Wiring: Effect Selector & Schema-Driven Inspector

## Verdict

**APPROVED.** No required changes. Three INFO notes (none blocking) and two LOW notes for future product-effect tasks.

## Independent Verification

All checks performed without relying on Cursor's self-report.

| Check | Result | Evidence |
|---|---|---|
| `npx tsx scripts/verify-editor-wiring.ts` | ✅ passed | `Editor wiring self-check passed` |
| `npm run build` (vue-tsc + Vite) | ✅ passed | 3.1s; only known three-chunk warning |
| Dev server `http://localhost:18806/` | ✅ HTTP 200 | `curl -I` returned 200 |
| Headless Edge visual capture | ✅ 87 KB PNG, full UI | `.workbuddy/wire1.png` — see below |
| `requestAnimationFrame` scope | ✅ only `VisualEngine.ts` | grep returns 2 hits, both in VisualEngine |
| `from 'three'` scope | ✅ only `src/visual/**` | 4 hits, all in `VisualEngine`/`types`/`PlaceholderOrb`/`dispose` |
| `VisualEngine` import scope (components) | ✅ only `VisualStage.vue` | 0 violations in Selector/Inspector/Header |
| `src/stores/` AudioData contamination | ✅ clean | grep returned no matches |
| New dependencies | ✅ none | `package.json` diff shows only the prior `@types/three` |
| Git scope | ✅ matches report | all changed files match the Changed/Added list |
| `.codex/`, `.cursor/` modifications | ✅ none (Cursor-side) | only WorkBuddy-authored `.codex/`/`.workbuddy/` diffs in tree |

## Visual Evidence

Headless Edge (swiftshader) capture at virtual time 5 s — confirms the spec's Behavioral Req 1 (page load → PlaceholderOrb + 6 controls, default values correct):

- **Selector**: PlaceholderOrb highlighted (active); LiquidOrb/GlassWave/EnergyCore dimmed with "Not yet available" (Req 2 satisfied visually).
- **Stage**: Low-poly icosahedron with key-light highlight; HUD label "PlaceholderOrb" bottom-right.
- **Inspector**: All four groups present (Appearance / Motion / Voice Response / Light) with six controls (Primary Color, Wireframe, Idle Speed @ 1.0, Volume Sensitivity @ 1.0, Key Light, Ambient = Normal).
- **Header**: Mic disabled (per spec Out of Scope), **Reset enabled** (primary color), Export disabled.

## Architecture Spot-Checks (per spec §5 bridge + Reviewer Notes)

1. **One-way bridge (store → engine only)**: `VisualStage.vue` is the sole `VisualEngine` importer; `EffectSelector`/`Inspector`/`Header` only touch the store; the engine never writes to Pinia. Confirmed by grep + code review.
2. **No effect-specific branching in Inspector**: Inspector's `v-if`/`v-else-if` dispatches only on `control.type` (`'slider'|'color'|'switch'|'select'`). A hypothetical new effect (e.g. `liquid-orb`) with the same control types and groups would render with zero Inspector changes — exactly the property the spec is buying.
3. **Schema-driven Selector availability**: Selector disables entries via `editorStore.isEffectAvailable(id)`, which derives from `availableEffectIds` synced by `VisualStage` post-`registerEffect`. Three product entries are correctly muted, click is no-op (Req 2).
4. **Slider throttle**: `ElSlider` uses `:model-value` + `@change` (not `@input`). No store writes during drag — confirms Req "拖动 slider 过程中动画不卡顿". Element Plus maintains thumb position from internal `firstValue` during drag; on release `@change` fires once and updates the store.
5. **Dirty-schema defense**: `isMissingSelectOptions(control)` gates the `ElSelect` and falls back to a disabled placeholder; `warnedSelectKeys: Set` ensures a single console warning per key per session.
6. **Reset semantics**: `resetEffectSettings()` resets the store to `defaultSettings(currentDefinition.controls)`; deep watch on `settings` propagates the new full object to `engine.updateSettings`, which `mergeSettings` applies atomically. No effect id is required — the reset reuses the current effect's defaults.
7. **Effect switch (forward-compat)**: `applyCurrentEffect` calls `engine.setEffect` then `syncEffectDefinition(def, engine.getSettings())` — engine returns fresh defaults post-setEffect, and the store resets `settings` accordingly. When LiquidOrb/GlassWave/EnergyCore land, the selector will just become clickable and Inspector will rebuild from the new schema with zero extra code.

## Notes (Non-Blocking)

### INFO-1: Effect-switch triggers a redundant settings write to the engine

In `VisualStage.vue` `applyCurrentEffect()`:
```ts
engine.setEffect(effectId)                          // engine.settings = defaults
editorStore.syncEffectDefinition(def, engine.getSettings())  // store.settings = defaults
```
The second call replaces `store.settings.value`, which fires the deep `watch(settings)` and calls `engine.updateSettings(equalDefaults)` again. Harmless (mergeSettings overwrites with same values; engine stays consistent) but it is one extra RAF-cost-free call on every effect switch. When the product effects land, you may want to suppress the second `updateSettings` when the watch fires immediately after `setEffect` (e.g. via a small "just switched" guard flag). Not blocking.

### INFO-2: `store.updateSetting` mutates `settings.value` in place

```ts
settings.value[key] = value
```
This works correctly with `deep: true` watching but breaks referential-equality assumptions. If a future Task wants to detect "did anything change" cheaply, prefer `settings.value = { ...settings.value, [key]: value }`. Cosmetic; current tests all pass.

### INFO-3: `warnedSelectKeys` is module-level, never cleared

`InspectorPanel.vue` declares the Set at module scope. Across effect switches, the same key is warned at most once per page lifetime, which is the spec's intent. If you want per-effect warnings later, scope the Set to a `watch(currentDefinition, ...)` reset. Not a bug.

### LOW-1: `applyCurrentEffect` does not catch `VisualEngineError('INIT_FAILED')` thrown from the engine

If a future buggy product effect's `init` throws, the error propagates out of the `watch(selectedEffectId, ...)` callback and the store ends up with `currentDefinition = null` (set on previous `syncAvailableEffects`) but `selectedEffectId` pointing at the failing effect. The new effect's selection is then unrecoverable until the user picks a different effect. The existing onMounted try/catch handles initial boot only. Consider wrapping `applyCurrentEffect` in try/catch and falling back to the previous effect on failure. Becomes important from TASK-005 onward when effects get more complex.

### LOW-2: `engine.resetSettings()` is unused

The engine exposes `resetSettings()` (lines 116–122 of `VisualEngine.ts`) but the store's `resetEffectSettings` only drives `engine.updateSettings` via the deep watch. Both paths produce the same result, so the engine method is dead code. Either delete it or route the store through it. Not blocking; the engine-side method is fully tested by the existing visual self-check.

## Acceptance Criteria

- [x] `npm run build` passes; no new dependencies
- [x] Behavioral Req 1 (page load → PlaceholderOrb + 6 controls, default values) — visually confirmed
- [x] Architectural grep items — confirmed
- [x] Inspector has no effect-specific branches — confirmed by code review
- [x] Slider throttle via `@change` — confirmed
- [x] Selector disables unavailable effects — confirmed visually and by `selectEffect` guard
- [x] Reset enables and restores defaults — wired through store; engine stays in sync via watch

## Issues Worth Knowing

- **ADR deferred**: `ControlDefinition.options` shape extension is a DATA_MODEL §5 evolution consistent with ADR-006. The spec's Reviewer Notes correctly flagged this as a future ADR candidate, not a blocker. The user is aware.
- **TASK-003 INFO-1 (chunk size)**: still not addressed; remains an Out of Scope for this Task and is correctly deferred.

## Recommendation

Approve and proceed to TASK-005 (first product effect, e.g. LiquidOrb). The wiring layer is now general enough that a new effect is a one-file add (`src/visual/effects/LiquidOrb.ts` exporting `liquidOrbDefinition` + `createLiquidOrb`, plus a one-line `registerEffect` call in `VisualStage.vue`'s onMounted). Confirm with user whether to tackle LOW-1 (the only LOW with real-world risk) before the first product effect lands, or to bundle it into the LiquidOrb Task.
