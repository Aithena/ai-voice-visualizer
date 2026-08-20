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
