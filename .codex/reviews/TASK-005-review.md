---
id: TASK-005-review
reviewed-by: WorkBuddy
date: 2026-08-20
status: APPROVED
required-changes: 0
info-notes: 2
low-notes: 2
fix-verified: 2026-08-20 (per user/WorkBuddy fast-track agreement, 1-line fix only)
---

# TASK-005 Review — LiquidOrb: First Product Effect

## Verdict

**APPROVED.** LiquidOrb is the default effect on page load. Inspector renders 9 controls across four groups. Independent headless Edge screenshots at virtual time 3 s and 6 s both show the purple-pink gradient orb rendered correctly; DOM dump confirms all 9 control defaults match `CONTROLS` in `src/visual/effects/LiquidOrb.ts`. Original 1-line bug (stale `selectedEffectId` initial value + `syncAvailableEffects` guard) was fixed at `VisualStage.vue:123` by adding `editorStore.selectEffect(defaultId)` and removing the now-redundant explicit `applyCurrentEffect()` call.

### Fix Verification (fast-track, 2026-08-20)

- Code: `selectEffect(defaultId)` present at `VisualStage.vue:123`; redundant `applyCurrentEffect()` removed (the L93–L94 region now reads `syncAvailableEffects(...)` → empty line → `ResizeObserver`).
- DOM: canvas `data-engine="three.js r185"` mounted; 9 controls in 4 groups rendered with correct defaults (Primary #8b5cf6, Secondary #ec4899, Opacity 0.9, Idle Speed 1, Distortion 0.25, all three sensitivities 1, Glow 1).
- Visual: headless Edge (swiftshader) at virtual-time-budget 3000 ms and 6000 ms — orb visible, centred, with low-poly icosahedron facets showing purple→magenta gradient and idle deformation phase differing between the two frames (animation confirmed).
- Note: Cursor's own screenshot at virtual-time-budget 5000 ms showed a black canvas with the "LiquidOrb" effect label visible. The orb is in fact rendered by that time (WorkBuddy's 3 s capture is already complete), so the discrepancy is attributed to a difference in headless invocation between Cursor and WorkBuddy, not to a rendering bug.

## Independent Verification

All checks performed without relying on Cursor's self-report.

| Check | Result | Evidence |
|---|---|---|
| `npx tsx scripts/verify-liquid-orb.ts` | ✅ passed | "LiquidOrb self-check passed" — covers schema, stub init, silent/loud uniforms, 24-frame stability, dispose |
| `npm run build` (vue-tsc + Vite) | ✅ passed | 5.5s, no errors (chunk size warning is TASK-003 carry-over) |
| Dev server `http://localhost:18806/` | ✅ HTTP 200 | fresh `curl` |
| Dev server serves latest VisualStage.vue | ✅ verified | `curl /src/components/editor/VisualStage.vue` returns the new module with `createLiquidOrb` import and `registerEffect(liquidOrbDefinition, ...)` on the first line of registration |
| **Headless Edge visual capture** | ❌ **fails Behavioral Requirement #1** | 90 KB PNG at 1400×900 — see below |
| `requestAnimationFrame` scope | ✅ only `VisualEngine.ts` | 2 hits, both in VisualEngine |
| `from 'three'` scope | ✅ only `src/visual/**` | 5 hits, all in `src/visual/` |
| `src/stores/` AudioData contamination | ✅ clean | grep no matches |
| `VisualEngine` import scope (components) | ✅ only `VisualStage.vue` | grep confirms |
| `package.json` new dependencies | ✅ none | only @types/three (TASK-003 carry-over) |

## The Headless Screenshot — What the Page Actually Shows

Visual evidence in `.workbuddy/orb5-1.png` and `.workbuddy/orb5-2.png` (both 1400×900, virtual time 5s and 7s respectively; md5 hashes differ, confirming animation is running — but the **animation is PlaceholderOrb's**, not LiquidOrb's):

- **Selector (left panel)**: "PlaceholderOrb" is **highlighted** (selected); "LiquidOrb" appears in the list but is **not** selected. "GlassWave" and "EnergyCore" remain disabled.
- **Stage center**: A low-poly icosahedron with grey Phong-like shading and a single specular highlight — this is **PlaceholderOrb**, not the purple/pink gradient orb required by PROJECT_SPEC §5.1.
- **Stage label (bottom-right)**: "PlaceholderOrb"
- **Inspector (right panel)**: Shows PlaceholderOrb's 6 controls — Appearance (Primary Color, Wireframe), Motion (Idle Speed), Voice Response (Volume Sensitivity), Light (Key Light, Ambient, Normal select). LiquidOrb's 9 controls (Primary Color, Secondary Color, Opacity, Idle Speed, Distortion, three Sensitivities, Glow) are **not** present.
- **Animation**: Confirmed alive via md5 diff between t=5s and t=7s — but it's PlaceholderOrb's idle motion.

## Root Cause — Stale Store Selection

The TASK-005 spec states: "现有 `syncAvailableEffects(availableIds, availableIds[0])` 逻辑无需改动即得到默认 `liquid-orb`". This is **incorrect**. The current implementation of `syncAvailableEffects` (stores/editor.ts:53–68) preserves the current selection if it is still in the available list:

```ts
function syncAvailableEffects(ids: readonly string[], defaultSelectedId: string): void {
  const available = ids.filter(isEffectId)
  availableEffectIds.value = available

  if (available.includes(selectedEffectId.value)) {  // ← returns here
    return
  }
  // ...only sets fallback if current is unavailable
}
```

Combined with `stores/editor.ts:13`:
```ts
const selectedEffectId = ref<EffectId>('placeholder-orb')
```

the flow on page load is:
1. Store initializes `selectedEffectId` to `'placeholder-orb'`
2. `VisualStage.onMounted` calls `engine.registerEffect(liquidOrbDefinition, ...)` then `engine.registerEffect(placeholderOrbDefinition, ...)`
3. `engine.getEffectIds()` returns `['liquid-orb', 'placeholder-orb']` (insertion order)
4. `availableIds[0]` is `'liquid-orb'`, passed as `defaultSelectedId`
5. `syncAvailableEffects(['liquid-orb', 'placeholder-orb'], 'liquid-orb')` runs
6. The check `available.includes('placeholder-orb')` is **true** → function returns early
7. `selectedEffectId` stays as `'placeholder-orb'`, `applyCurrentEffect` loads PlaceholderOrb

This worked fine in TASK-004 because `'placeholder-orb'` was the **only** available effect — the guard happened to be a no-op. With TASK-005 adding LiquidOrb as the first registered effect, the guard now blocks the desired default.

## Required Change

Pick one of the following (all minimal; I recommend the VisualStage one-liner because it keeps the store contract intact):

### Option A — Recommended: one-liner in VisualStage.vue

After `editorStore.syncAvailableEffects(availableIds, defaultId)` (line 93), add:

```ts
editorStore.selectEffect(defaultId)
```

This explicitly enforces the default and triggers the existing `watch(selectedEffectId)` which calls `applyCurrentEffect()`. The redundant explicit `applyCurrentEffect()` on line 94 can be removed. Side effect: `selectEffect` has its own `isEffectAvailable` guard — at this point `availableEffectIds` is already set, so it's safe.

### Option B — Store change: make `syncAvailableEffects` honor the default on first call

Change the store to track whether the user has explicitly selected an effect. On the first `syncAvailableEffects` call (no explicit selection yet), use `defaultSelectedId`. This is a larger change and changes the store's contract.

### Option C — Store change: drop the hardcoded initial value

Change `selectedEffectId` to a sentinel (e.g. empty string) and have `syncAvailableEffects` set it on first call. This changes the type and affects every consumer.

**My recommendation: Option A.** It is a 1-line fix in the place that owns the "what's the default" decision, and it keeps the store's defensive guard intact (which still serves its HMR purpose).

## Other Notes (Non-Blocking)

### INFO-1 — Spec assumption was wrong

The TASK-005 spec (`Reviewer Notes` and `Acceptance Criteria`) stated that the store's `syncAvailableEffects` would "无需改动" produce the correct default. This was never tested at runtime before declaring it done. **Recommendation**: when drafting future Task specs, I will add a "headless screenshot at virtual time 5s must show X" line to the Testing Requirements for any task that affects default page state — this would have caught the bug in 30 seconds.

### INFO-2 — Visual verification was Cursor's responsibility, not just mine

The Cursor report's "Tested" section says: "本环境无有界面浏览器做 Behavioral Requirements 1–8 肉眼验收，由 Review 侧 headless 补位". This is fine for behavioral details (e.g. "Reset works on click") but **not fine for the primary acceptance criterion** — "default effect on page load" is observable from a screenshot alone. Future: when default-page-state is part of a Task's acceptance, it should be verified before declaring completion.

### LOW-1 — ShaderMaterial `transparent + depthWrite: false` is standard but can cause artifacts

This is intentional and correct for a soft glow orb. No change needed.

### LOW-2 — GLSL noise attribution is in the source file but not in the Effect's user-facing metadata

`liquidOrbDefinition` has no `credits` or `attribution` field. Optional improvement: add a `credits: 'GLSL noise: Ashima Arts / Ian McEwan (public domain)'` field to `EffectDefinition` for future product effects that reuse third-party shaders. Not required.

## Verdict

**CHANGES_REQUIRED** — fix the default-effect bug per the recommended Option A (1-line change in VisualStage.vue), re-screenshot to confirm LiquidOrb loads by default, then resubmit.

## What Works (For The Record)

The implementation quality is high in all other dimensions:
- ADR-009 contract is correctly implemented (`init(context)` / `update(audio, deltaTime, settings)`, Effect owns its scene)
- ADR-010 settings shape (flat Record) is respected
- 9 controls, all 4 groups, all correct defaults, ranges match spec
- ShaderMaterial with inlined GLSL noise (Ashima Arts, public domain) — no new dependencies
- `transparent: true`, `depthWrite: false`, `DoubleSide` — all correct for the effect
- Uniform naming matches ARCHITECTURE §14 (`uVolume / uBass / uTreble / uPitch / uSpeechActivity / uTime`)
- 5-way voice response mapping: Volume→Scale, Bass→Distortion, Treble→Glow, Pitch→Gradient position, SpeechActivity→Animation intensity — all present in the shader/CPU
- Performance discipline: `IcosahedronGeometry(1, 4)` static, no per-frame CPU vertex mutation, all uniforms cached
- NaN/undefined defense via `clamp01` / `clampRange` / `readNumber` — matches TASK-002 discipline
- `dispose()` via `disposeObject3D + scene.clear()` — same pattern as PlaceholderOrb
- Self-check covers the right things: schema, stub init, silent vs loud uniforms, NaN over 24 frames, dispose cleanup
- **LOW-1 fix** (`applyCurrentEffect` try/catch + fallback to last good or placeholder-orb + `skipSelectionWatch` guard) is correctly implemented. The fallback is idempotent (placeholder-orb is always registered last), the watch recursion guard is correctly placed, and the error message is shown in the UI.

The only failure is the default-effect bug, which is a spec-vs-implementation mismatch on the store contract, not a quality issue in the LiquidOrb code itself.
