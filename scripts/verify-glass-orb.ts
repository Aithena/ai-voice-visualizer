import { PerspectiveCamera, WebGLRenderer } from 'three'
import { defaultSettings } from '../src/visual/settings'
import { GlassOrb, createGlassOrb, glassOrbDefinition } from '../src/visual/effects/GlassOrb'
import { liquidOrbDefinition } from '../src/visual/effects/LiquidOrb'
import type { AudioData } from '../src/audio/types'
import type { VisualEffectContext } from '../src/visual/types'

const REQUIRED_KEYS = [
  'rimColor',
  'coreColor',
  'opacity',
  'rimWidth',
  'refractionIntensity',
  'idleSpeed',
  'volumeSensitivity',
  'speechSensitivity',
  'highlightStrength',
] as const

const FORBIDDEN_LIQUID_KEYS = [
  'primaryColor',
  'secondaryColor',
  'distortion',
  'bassSensitivity',
  'trebleSensitivity',
  'glowIntensity',
] as const

const SILENT: AudioData = {
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  pitch: 0,
  speechActivity: 0,
}

const LOUD: AudioData = {
  volume: 1,
  bass: 0.8,
  mid: 0.5,
  treble: 0.6,
  pitch: 0.7,
  speechActivity: 1,
}

function runGlassOrbSelfCheck(): void {
  if (glassOrbDefinition.id !== 'glass-orb') {
    throw new Error('unexpected GlassOrb id')
  }
  if (glassOrbDefinition.preferredStageStyle !== 'light') {
    throw new Error('GlassOrb should prefer light stage')
  }
  if (glassOrbDefinition.controls.length !== 9) {
    throw new Error(`expected 9 controls, got ${glassOrbDefinition.controls.length}`)
  }

  const settings = defaultSettings(glassOrbDefinition.controls)
  for (const key of REQUIRED_KEYS) {
    if (!(key in settings)) {
      throw new Error(`missing control ${key}`)
    }
  }

  const glassKeys = new Set(glassOrbDefinition.controls.map((control) => control.key))
  for (const key of FORBIDDEN_LIQUID_KEYS) {
    if (glassKeys.has(key)) {
      throw new Error(`GlassOrb control key collides with LiquidOrb: ${key}`)
    }
  }

  const liquidSpecific = new Set(liquidOrbDefinition.controls.map((control) => control.key))
  for (const key of FORBIDDEN_LIQUID_KEYS) {
    if (!liquidSpecific.has(key)) {
      throw new Error(`LiquidOrb fixture missing ${key}`)
    }
  }

  const groups = new Set(glassOrbDefinition.controls.map((control) => control.group))
  for (const group of ['style', 'appearance', 'motion', 'voiceResponse', 'light'] as const) {
    if (!groups.has(group)) {
      throw new Error(`missing control group ${group}`)
    }
  }

  for (const control of glassOrbDefinition.controls) {
    if (control.type !== 'slider') {
      continue
    }
    const value = control.defaultValue
    if (typeof value !== 'number' || value < (control.min ?? 0) || value > (control.max ?? 1)) {
      throw new Error(`slider default out of range: ${control.key}`)
    }
  }

  const effect = createGlassOrb()
  if (!(effect instanceof GlassOrb)) {
    throw new Error('createGlassOrb should return GlassOrb')
  }

  const context = {
    renderer: {} as WebGLRenderer,
    camera: new PerspectiveCamera(45, 1, 0.1, 100),
    width: 800,
    height: 600,
  } satisfies VisualEffectContext

  effect.init(context)
  effect.update(SILENT, 16, settings)
  const silentUniforms = effect.getDebugUniforms()
  assertFinite(silentUniforms)
  assertEqual('silent volume', silentUniforms.uVolume, 0)
  assertEqual('silent speech', silentUniforms.uSpeechActivity, 0)

  effect.update(LOUD, 16, settings)
  const loudUniforms = effect.getDebugUniforms()
  assertFinite(loudUniforms)
  assertEqual('loud volume', loudUniforms.uVolume, 1)
  assertEqual('loud bass', loudUniforms.uBass, 0.8)
  assertEqual('loud treble', loudUniforms.uTreble, 0.6)
  assertEqual('loud pitch', loudUniforms.uPitch, 0.7)
  if (!(loudUniforms.uSpeechActivity > silentUniforms.uSpeechActivity)) {
    throw new Error('speech should raise the highlight-driving uniform')
  }

  for (let i = 0; i < 24; i += 1) {
    effect.update(i % 2 === 0 ? SILENT : LOUD, 16.67, settings)
  }
  assertFinite(effect.getDebugUniforms())

  effect.dispose()
  if (effect.scene.children.length !== 0) {
    throw new Error('dispose should clear the scene')
  }
  effect.dispose()
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`)
  }
}

function assertFinite(values: Record<string, number>): void {
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) {
      throw new Error(`${key} is not finite: ${value}`)
    }
  }
}

runGlassOrbSelfCheck()
console.log('GlassOrb self-check passed')
