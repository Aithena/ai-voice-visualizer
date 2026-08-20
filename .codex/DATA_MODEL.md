# Data Model

> Project: `ai-voice-visualizer`

This document defines the major data categories and their ownership.

---

## 1. Data Ownership Model

```text
Runtime Data
    ↓
Audio / Visual Runtime

Editor Data
    ↓
Pinia

Persistent Data
    ↓
Preset Storage / Import / Export
```

---

## 2. AudioData

Runtime-only, non-persistent.

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

All values are normalized to `0..1`.

---

## 3. VisualSettings

Editor configuration for an effect.

Conceptual fields may include:

- speed
- color
- glow
- intensity
- distortion
- scale
- rotation
- response sensitivity
- smoothing

The exact fields are effect-specific and should be defined through `ControlDefinition`.

---

## 4. VoiceResponseSettings

Defines how audio features influence visual properties.

Conceptual mapping:

```text
volume          → scale / intensity
bass            → energy / distortion
mid             → wave amplitude
treble          → glow / detail
pitch           → color / rotation
speechActivity  → overall activity
```

Mappings must remain configurable.

---

## 5. EffectDefinition

Static metadata describing an available visual effect.

```ts
interface EffectDefinition {
  id: string
  name: string
  description?: string
  controls: ControlDefinition[]
}
```

---

## 6. ControlDefinition

Schema for an Inspector control.

Conceptual fields:

```ts
interface ControlDefinition {
  id: string
  label: string
  type: string
  defaultValue: unknown
  min?: number
  max?: number
  step?: number
  group?: string
}
```

The implementation may use a stricter discriminated union later.

---

## 7. VisualPreset

Serializable user configuration.

A preset should contain enough information to restore:

- selected effect
- effect settings
- voice response settings
- preset metadata

A preset must not contain:

- microphone streams
- AudioContext instances
- analyser nodes
- Three.js objects
- GPU resources
- transient AudioData

---

## 8. Editor State

Pinia may own:

- selected effect id
- selected preset
- effect configuration
- voice response configuration
- Inspector/UI state

Pinia must not own continuously changing per-frame AudioData.

---

## 9. Persistence Rules

Persistent data must be serializable.

Do not serialize browser/runtime objects.

Import must validate external data before applying it to editor state.

Export should produce a stable JSON representation suitable for future preset compatibility.
