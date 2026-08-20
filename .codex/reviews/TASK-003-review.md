# TASK-003 Review — Visual Foundation

| Field | Value |
|---|---|
| **Task** | TASK-003 — Visual Foundation |
| **Reviewer** | WorkBuddy (architect role) |
| **Date** | 2026-08-20 |
| **Result** | **APPROVED** (no required changes) |
| **Verdict detail** | 0 CRITICAL · 0 HIGH · 0 MEDIUM · 0 LOW · 4 INFO |
| **Spec author** | WorkBuddy (TASK-003.md drafted 2026-08-20; ADR-009/010 embedded, transcribed to `DECISIONS.md` the same day) |

## Independent verification

All checks re-run by reviewer; nothing taken on the agent's self-report.

| Check | Result | Detail |
|---|---|---|
| `npx tsx scripts/verify-visual-foundation.ts` | PASS | "Visual foundation self-check passed" |
| `npm run build` (vue-tsc + vite) | PASS | 2.54s, 664.05 kB JS (185.08 kB gzip); Vite reports chunk-size warning (expected, see INFO-1) |
| Dev server reachability | PASS | `GET http://localhost:18806/` → 200 (468 B index referencing `main.ts`); `VisualStage.vue` module → 200 (Vite transformed) |
| Runtime visual (headless Edge, swiftshader) | PASS | `shot1.png` (virtual time 5 s) and `shot2.png` (virtual time 6.5 s) differ in md5; central low-poly orb (icosahedron + ambient + directional key light) renders correctly inside the stage viewport; HUD intact (header / Effects panel / Inspector "Awaiting schema" / "PlaceholderOrb" label). No console error dialog. Evidence retained under `.workbuddy/shot{1,2}.png`. |
| `requestAnimationFrame` scope | PASS | Grep → 2 hits, both in `src/visual/VisualEngine.ts` (line 125, 185). No other RAF anywhere in `src/`. |
| `three` import scope | PASS | Grep → 4 hits, all in `src/visual/**` (dispose.ts, effects/PlaceholderOrb.ts, types.ts, VisualEngine.ts). No Vue component imports `three` directly. `VisualStage.vue` imports `@/visual` only. |
| `AudioData` ↔ Pinia leak | PASS | Grep `AudioData` → only inside `src/audio/`, `src/visual/**`, and `.codex/` docs. No `stores/` references. |
| `package.json` diff | PASS | Single new dep: `@types/three@^0.185.4` (devDependency). `three` was already present from TASK-001. No other package added. |
| Git working tree | PASS | Cursor changes match report scope exactly: `M src/components/editor/VisualStage.vue`, `M src/visual/index.ts`, `A scripts/verify-visual-foundation.ts`, `A src/visual/{VisualEngine,dispose,errors,registry,selfCheck,settings,types}.ts`, `A src/visual/effects/PlaceholderOrb.ts`, `M package.json` + `package-lock.json`. `.codex/`, `.cursor/`, `src/audio/`, `src/stores/`, `src/components/**` (except VisualStage) all untouched by Cursor. (`.codex/`, `.workbuddy/`, `package*.json` modifications are reviewer's own.) |
| Earlier `.cursor/README.md` corruption (patch meta-text) | OBSERVED → RESOLVED in working tree | No longer in `git status`; assumed committed/cleared between TASK-002 review and now. No action required from Cursor. |

## Contract compliance vs `TASK-003.md`

- **ADR-009 VisualEffect contract** (`init(context)`, `update(audio, deltaTime, settings)`, `scene` owned by Effect, `resize`, `dispose`): `src/visual/types.ts:37-45` and `src/visual/effects/PlaceholderOrb.ts:51-113` both implement verbatim. ✓
- **ADR-010 VisualSettings shape** (`Record<string, number|string|boolean>`, populated from `EffectDefinition.controls`): `src/visual/types.ts:19-28` + `src/visual/settings.ts` + `PlaceholderOrb.controls` (2 items across `appearance` and `motion` groups) ✓
- **Behavioral requirements** (1-11 in spec): all observed in code
  - 1. `WebGLRenderer` with antialias/alpha, `setPixelRatio` clamped to ≤2, `SRGBColorSpace`, `forceContextLoss`+`dispose`+`remove()` on shutdown; `createRenderer` throws `WEBGL_UNAVAILABLE` and removes the canvas on any failure (no half-initialised DOM). ✓
  - 2. `start()` idempotent; per-frame sequence `audioProvider() → effect.update(audio, deltaTime, settings) → renderer.render(effect.scene, camera)` (`VisualEngine.ts:179-203`); `deltaTime` clamped 0..100 ms. ✓
  - 3. Zero per-frame allocation: `SILENT_AUDIO` is a frozen module-level const; loop body allocates nothing. `readNumber`, `color.set`, `mesh.scale.set` all reuse instances. ✓
  - 4. `setEffect` disposes old effect (clears state first, then `dispose()`), runs `factory()` + `init()` in `try/catch`; on init failure the partial effect is disposed, state cleared, and a `VisualEngineError('INIT_FAILED')` rethrown. ✓
  - 5. `updateSettings` is in-place merge with unknown-key + `undefined` filtering; no scene rebuild. ✓
  - 6. `resize(0, _)` sets `skipRender=true` (no render until non-zero dimensions arrive); ResizeObserver wires stage size into `engine.resize`. ✓
  - 7. `dispose()` order: `stop()` → `disposeCurrentEffect()` → null out renderer → `forceContextLoss()` → `renderer.dispose()` → `canvas.remove()`. Idempotent. ✓
  - 8. `registry.register` throws `DUPLICATE_EFFECT`; `registry.get` throws `EFFECT_NOT_REGISTERED`. Engine has zero hard-coded effect ids or branches. ✓
  - 9. `PlaceholderOrb`: low-poly icosahedron (level 1), `MeshStandardMaterial` with ambient + directional key light; idle sine breathe + slow yaw/pitch (driven by `deltaTime * idleSpeed`); `volume` drives additional scale (proves audio→visual pipeline; goes silent because no `audioProvider` is wired yet). Two `controls` (`primaryColor` / `idleSpeed`) exercise the settings path. ✓
  - 10. `readAudio()` falls back to `SILENT_AUDIO` when provider is absent or throws. ✓
  - 11. `src/visual/index.ts` re-exports `VisualEngine`, `VisualEngineError`, types, `EffectRegistry`, `defaultSettings`, `mergeSettings`, `createPlaceholderOrb`, `placeholderOrbDefinition`. ✓

## Code quality notes (non-blocking)

- **State machine integrity** — `setEffect` and `dispose` both null `this.effect`, clear `currentEffectId`, reset `settings` *before* calling `effect.dispose()`; this prevents a half-disposed effect from observing inconsistent engine state if `dispose()` throws. Deliberate and correct.
- **Race coverage** — `start()` short-circuits on `disposed` and `running`; `stop()` is safe at any time (`rafId=0` guard); `updateSettings` and `resetSettings` short-circuit on disposed/no-effect. `setEffect` is gated by `assertActive`. All public entry points have explicit invariants.
- **Resource ownership discipline** — `disposeObject3D` (`src/visual/dispose.ts`) only walks `Mesh` nodes (geometry + material), correctly handles `Material | Material[]`, and lights without GPU resources are left to `scene.clear()`. Engine's `forceContextLoss` + `renderer.dispose` + canvas removal is the textbook way to avoid WebGL context leaks on hot reload.
- **Color application optimisation** — `PlaceholderOrb` tracks the last applied colour on `material.userData.appliedColor` and skips `Color.set` when unchanged; avoids needless per-frame string parsing in the hot path once the user has settled on a colour.
- **Initial 0×0 case** — first `resize(0,0)` from mount is handled cleanly by `skipRender`; ResizeObserver will re-fire as soon as layout settles, so the first render is automatically on a correctly sized canvas. No race, no flash.

## Findings

### INFO-1 — Vite chunk-size warning (664 kB main bundle)

`three` is bundled into the main chunk. Expected for the foundation; not a defect. **Recommended action (next task, not this one)**: when product effects land, consider `build.rollupOptions.output.manualChunks` to split `three` and effect code into their own chunks, and/or dynamic `import()` for effect modules so the initial bundle is leaner. Track in TASK-004 (first product effect) or a dedicated "build optimisation" Task.

### INFO-2 — Asymmetric `assertActive` usage

`setEffect` and `registerEffect` throw `DISPOSED` via `assertActive`; `getSettings`, `getEffectIds`, `updateSettings`, `resetSettings` do not (they short-circuit silently or return safe defaults). This is **intentional** (read-only / no-op after dispose is a sane default) and the spec is silent, but document the asymmetry if a future caller wonders. No code change needed.

### INFO-3 — `updateSettings` silently ignores calls before `setEffect`

Same family as INFO-2. If the editor ever wires Inspector before the engine has an effect mounted, settings writes will be dropped without notice. A single `console.warn` in dev mode would be a cheap diagnostic, but not required. The spec allows this.

### INFO-4 — `PlaceholderOrb` colour cache uses `material.userData.appliedColor`

A class field (`this.appliedColor`) would be marginally more idiomatic. Cosmetic only.

## Acceptance criteria status

| Spec section | Result |
|---|---|
| Project — build passes, only `three`/`@types/three` added | PASS |
| Runtime — orb appears, animates, resizes, hot-reload-clean, WebGL-failure path | PASS (independently confirmed by headless Edge screenshots and code review) |
| Architecture — RAF scope, `three` import scope, no Pinia AudioData, Effect dispose completeness | PASS |

## Conclusion

TASK-003 meets every spec requirement with no required changes. The implementation is conservative (well-bounded RAF loop, deterministic dispose order, init-failure isolation) and the diff is exactly the scope promised in the completion report. ADR-009 and ADR-010 are honoured in the types and in the placeholder effect; the runtime path is end-to-end verified.

**Ready to proceed to TASK-004.** Suggested next scope per the spec's Out-of-Scope list and the Effect Selector/Inspector still showing "Awaiting schema": a Task that wires the Effect Selector to `engine.setEffect` *and* upgrades the Inspector to render `EffectDefinition.controls` via the ADR-010 schema — that pair is the natural next dependency for any product effect work, and it unblocks TASK-005+ without revisiting the contract.

`STATUS.md` will be updated to mark TASK-003 **COMPLETED** and TASK-004 **PLANNED** (subject to a separate Task spec draft, which the reviewer can prepare when the user signals the next direction).
