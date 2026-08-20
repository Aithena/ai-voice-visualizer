# Architecture Decisions

> Project: `ai-voice-visualizer`

This document records accepted architectural decisions. Existing ADRs must not be silently rewritten when a decision changes. Add a new ADR describing the previous decision, the new decision, the reason, affected modules, and migration strategy.

---

## ADR-001 — Vue 3 Is the UI Framework

**Status:** Accepted

### Decision

Use Vue 3 + TypeScript as the application UI layer.

### Reason

The project is an editor-oriented web application and requires a clear separation between UI state and the real-time visual runtime.

### Impact

Vue owns UI composition, panels, controls, and editor interactions. It does not own the real-time rendering loop.

---

## ADR-002 — Vue Must Not Drive Per-Frame Visual Rendering

**Status:** Accepted

### Decision

Vue reactivity and Pinia must not be used to drive every animation frame.

### Reason

Audio visualization requires a high-frequency runtime loop. Frame-level reactive updates would introduce unnecessary UI scheduling and coupling.

### Runtime Model

`requestAnimationFrame → AudioAnalyzer → VisualEngine.update() → Three.js render()`

---

## ADR-003 — Pinia Stores Editor State, Not Real-Time AudioData

**Status:** Accepted

### Decision

Pinia may store persistent/editor configuration and UI state, but must not store continuously changing AudioData such as volume, bass, mid, treble, or pitch on every frame.

### Reason

AudioData is ephemeral runtime data and belongs to the audio/visual runtime path.

---

## ADR-004 — Three.js Is the Core Visual Runtime

**Status:** Accepted

### Decision

Real-time visual effects use Three.js and, where appropriate, GLSL shaders.

### Reason

The product is a real-time visual design system rather than a static CSS animation.

### Constraint

GIFs, videos, and pre-rendered animations must not replace the real-time VisualEngine.

---

## ADR-005 — Visual Effects Use a Common Effect Contract

**Status:** Accepted

### Decision

Visual effects such as `LiquidOrb`, `GlassWave`, and `EnergyCore` must follow a common effect contract and registry model.

### Reason

The product must support future effects without redesigning the application architecture.

---

## ADR-006 — Effect Controls Are Schema-Driven

**Status:** Accepted

### Decision

Inspector controls are generated from effect/control definitions rather than being hard-coded independently inside each Vue component.

### Reason

Adding a new effect should primarily require a new Effect Definition and visual implementation, not a new Inspector architecture.

---

## ADR-007 — Element Plus Provides Editor Controls, Not Product Identity

**Status:** Accepted

### Decision

Element Plus may provide standard editor controls, but the product's visual language is defined by the project's Design System.

### Reason

The application should not look like a generic Element Plus administration panel.

---

## ADR-008 — Architecture Changes Require a New ADR

**Status:** Accepted

### Decision

When an accepted architecture decision must change, do not overwrite the old ADR. Create a new ADR that explains the change and migration impact.

---

## ADR-009 — VisualEffect Contract: init(context) + update(audio, deltaTime, settings)

**Status:** Accepted (2026-08-20, adjudicated by WorkBuddy/architecture role; user ratified)

### Decision

The common `VisualEffect` contract (extends ADR-005) is:

```ts
interface VisualEffectContext {
  renderer: THREE.WebGLRenderer   // engine-owned; effects must NOT dispose
  camera: THREE.PerspectiveCamera // engine-owned; effects must NOT dispose
  width: number
  height: number
}

interface VisualEffect {
  readonly id: string
  readonly name: string
  readonly scene: THREE.Scene    // effect-owned; fully released in dispose()
  init(context: VisualEffectContext): void
  update(audio: AudioData, deltaTime: number, settings: VisualSettings): void
  resize(width: number, height: number): void
  dispose(): void
}
```

### Reason

`ARCHITECTURE.md` §8 and `TECHNICAL_SPEC.md` §4 specified conflicting lifecycle signatures (`init(container)` + `update(audio, settings)` vs `mount(context)` + `update(audio, deltaTime)`). This ADR resolves the conflict:

1. `init(context)` is used because the VisualEngine owns the renderer/camera (TECHNICAL_SPEC §3); `init(container)` implied each effect creates its own renderer, contradicting engine ownership.
2. `update` takes both `deltaTime` (frame-rate-independent animation) and `settings` (live parameter changes applied on the next frame).
3. Each effect owns its own `THREE.Scene`; the engine renders `effect.scene`. Disposing the entire scene on effect switch prevents cross-effect resource leaks.

### Impact

Effects must never dispose the shared renderer/camera, and must fully dispose their own scene contents (geometries, materials, textures). TASK-003 is the reference implementation.

---

## ADR-010 — VisualSettings Is Effect-Specific Flat Settings Driven by ControlDefinition

**Status:** Accepted (2026-08-20, adjudicated by WorkBuddy/architecture role; user ratified)

### Decision

`VisualSettings` is a flat, effect-specific key-value map:

```ts
type VisualSettings = Readonly<Record<string, number | string | boolean>>
```

The exact fields for each effect are declared via that effect's `EffectDefinition.controls: ControlDefinition[]`. The Inspector's four sections (Appearance / Motion / Voice Response / Light) are expressed as `ControlDefinition.group` values (`'appearance' | 'motion' | 'voiceResponse' | 'light'`), not as a fixed global type shape.

### Reason

`ARCHITECTURE.md` §11 specified a fixed nested `VisualSettings` shape (appearance/motion/voiceResponse/light with fixed fields), while `DATA_MODEL.md` §3/§6 defined settings as effect-specific fields driven by `ControlDefinition`. The DATA_MODEL direction is adopted because:

1. ADR-006 already ruled that controls are schema-driven and adding an effect must not redesign the Inspector. A fixed nested shape hard-codes the parameters of the first three effects into a global type, breaking extensibility.
2. Different effects require different parameter sets (PROJECT_SPEC §5 defines different voice→visual mappings per effect).
3. The four Inspector sections remain fully supported as UI grouping metadata.

`ARCHITECTURE.md` §11's field lists remain useful as reference checklists when defining each effect's controls, but they are not a global type constraint.

### Impact

Presets store `{ effect: effectId, settings: flat map }`. The fixed nested `VisualSettings` interface from `ARCHITECTURE.md` §11 is superseded for implementation purposes. TASK-003 is the reference implementation.

---
