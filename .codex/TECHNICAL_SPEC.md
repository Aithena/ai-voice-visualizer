# Technical Specification

> Project: `ai-voice-visualizer`

This document translates the architecture into implementation-level contracts. It is intentionally framework-specific where necessary, but it does not contain business implementation code.

---

## 1. Runtime Layers

```text
UI Layer
  Vue 3
      ↓
Editor State
  Pinia
      ↓
Audio Runtime
  Web Audio API / AudioAnalyzer
      ↓
Voice → Visual Mapping
  VisualEngine
      ↓
Visual Runtime
  Three.js / GLSL
```

---

## 2. AudioAnalyzer Contract

The AudioAnalyzer is responsible for microphone/audio input and normalized analysis data.

### Required lifecycle

- `start()`
- `stop()`
- `dispose()`

### Required normalized output

```ts
interface AudioData {
  volume: number
  bass: number
  mid: number
  treble: number
  pitch: number
  speechActivity: number
}
```

All normalized values are `0..1`.

### Rules

- AudioData is runtime data.
- Do not persist AudioData.
- Do not push AudioData into Pinia on every animation frame.
- Handle AudioContext lifecycle explicitly.
- Handle microphone permission failure explicitly.
- Release audio resources on disposal.

---

## 3. VisualEngine Contract

VisualEngine owns the real-time visual runtime.

### Responsibilities

- Create and manage Three.js renderer/scene/camera.
- Register and switch visual effects.
- Receive AudioData.
- Apply Voice Response Settings.
- Update the active effect.
- Render the frame.
- Resize.
- Dispose resources.

### Runtime loop

```text
requestAnimationFrame
    ↓
AudioAnalyzer
    ↓
AudioData
    ↓
VisualEngine.update()
    ↓
Three.js renderer.render()
```

Vue/Pinia must not sit inside this per-frame path.

---

## 4. VisualEffect Contract

Every effect should expose a consistent lifecycle.

Conceptual contract:

```ts
interface VisualEffect {
  id: string
  mount(context: VisualEffectContext): void
  update(audio: AudioData, deltaTime: number): void
  resize(width: number, height: number): void
  dispose(): void
}
```

The exact interface may be refined during implementation, but the lifecycle responsibilities must remain.

---

## 5. Effect Registry

Effects should be discoverable through a registry rather than hard-coded branching throughout the application.

Initial effects:

- `LiquidOrb`
- `GlassWave`
- `EnergyCore`

Future effects may include:

- Particle
- Wave
- Fire
- Fluid
- Nebula
- Ring
- Avatar

Adding an effect should not require redesigning the Inspector or VisualEngine.

---

## 6. Effect Definition

Each effect should expose metadata describing its editable controls.

Conceptual model:

```ts
interface EffectDefinition {
  id: string
  name: string
  description?: string
  controls: ControlDefinition[]
}
```

A control definition should describe at minimum:

- control id
- label
- control type
- value
- min/max/step when applicable
- grouping/category
- optional mapping metadata

The Inspector consumes these definitions.

---

## 7. Voice Response Mapping

Audio features may drive visual properties such as:

- scale
- distortion
- glow
- color
- wave amplitude
- particle intensity
- energy
- rotation
- animation intensity

Mapping must be configurable rather than hard-coded independently inside each effect.

The mapping layer should support smoothing and response sensitivity.

---

## 8. State Categories

### Ephemeral Runtime Data

Examples:

- AudioData
- analyser buffers
- frame timing
- transient render state

Do not persist these in Pinia/localStorage.

### Editor State

Examples:

- selected effect
- current editable settings
- selected control
- editor UI state

Pinia is appropriate.

### Persistent Data

Examples:

- presets
- effect settings
- voice response settings
- preset metadata

These may be serialized for storage/import/export.

---

## 9. Resource Lifecycle

Three.js resources must be explicitly released when an effect or engine is disposed.

Consider:

- geometries
- materials
- textures
- render targets
- renderer
- animation frame handles

Audio resources must also be released:

- MediaStream
- AudioContext
- AudioNodes
- analyser resources

---

## 10. Performance Requirements

Primary target:

**60 FPS on supported desktop hardware.**

Rules:

- Avoid per-frame Vue reactivity.
- Avoid unnecessary object allocation inside the render loop.
- Prefer GPU/GLSL work for expensive visual deformation where appropriate.
- Reuse buffers and objects.
- Keep editor updates separate from runtime frame updates.
- Dispose resources deterministically.

---

## 11. Error Handling

The implementation must account for:

- microphone permission denied
- microphone unavailable
- AudioContext suspended
- unsupported browser capabilities
- renderer initialization failure
- invalid preset data
- effect initialization failure

Errors should not leave the application in a partially running state.

---

## 12. Browser/Runtime Boundary

Browser APIs such as microphone access and Web Audio must be accessed through dedicated runtime modules.

Vue components should consume high-level state/actions rather than directly owning the complete audio/render lifecycle.

---

## 13. Implementation Principle

Prefer this dependency direction:

```text
UI
 ↓
Editor State / Commands
 ↓
Runtime Services
 ↓
Visual Engine
 ↓
Three.js
```

Avoid:

```text
Three.js
 ↓
Vue Component
 ↓
Pinia
 ↓
AudioData
```

The second model violates the project's real-time separation.
