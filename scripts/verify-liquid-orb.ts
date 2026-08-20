import { PerspectiveCamera, WebGLRenderer } from 'three'
import { defaultSettings } from '../src/visual/settings'
import { LiquidOrb, createLiquidOrb, liquidOrbDefinition } from '../src/visual/effects/LiquidOrb'
import type { AudioData } from '../src/audio/types'
import type { VisualEffectContext } from '../src/visual/types'

const REQUIRED_KEYS = [
  'primaryColor',
  'secondaryColor',
  'opacity',
  'idleSpeed',
  'distortion',
  'volumeSensitivity',
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

function runLiquidOrbSelfCheck(): void {
  if (liquidOrbDefinition.id !== 'liquid-orb') {
    throw new Error('unexpected LiquidOrb id')
  }

  const settings = defaultSettings(liquidOrbDefinition.controls)
  for (const key of REQUIRED_KEYS) {
    if (!(key in settings)) {
      throw new Error(`missing control ${key}`)
    }
  }

  for (const control of liquidOrbDefinition.controls) {
    if (control.type !== 'slider') {
      continue
    }
    const value = control.defaultValue
    if (typeof value !== 'number' || value < (control.min ?? 0) || value > (control.max ?? 1)) {
      throw new Error(`slider default out of range: ${control.key}`)
    }
  }

  const effect = createLiquidOrb()
  if (!(effect instanceof LiquidOrb)) {
    throw new Error('createLiquidOrb should return LiquidOrb')
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
  assertEqual('silent bass', silentUniforms.uBass, 0)

  effect.update(LOUD, 16, settings)
  const loudUniforms = effect.getDebugUniforms()
  assertFinite(loudUniforms)
  assertEqual('loud volume', loudUniforms.uVolume, 1)
  assertEqual('loud bass', loudUniforms.uBass, 0.8)
  assertEqual('loud treble', loudUniforms.uTreble, 0.6)
  assertEqual('loud pitch', loudUniforms.uPitch, 0.7)
  assertEqual('loud speech', loudUniforms.uSpeechActivity, 1)
  if (!(loudUniforms.uDistortion > silentUniforms.uDistortion)) {
    throw new Error('bass should increase distortion above the idle baseline')
  }
  if (!(loudUniforms.uGlowIntensity > silentUniforms.uGlowIntensity)) {
    throw new Error('treble should increase glow above the idle baseline')
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

runLiquidOrbSelfCheck()
console.log('LiquidOrb self-check passed')
