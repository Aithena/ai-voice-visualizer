import {
  Color,
  DoubleSide,
  IcosahedronGeometry,
  Mesh,
  Scene,
  ShaderMaterial,
} from 'three'
import type { AudioData } from '@/audio'
import { disposeObject3D } from '../dispose'
import { liquidOrbFragmentShader, liquidOrbVertexShader } from '../shaders/liquidOrb'
import type {
  ControlDefinition,
  EffectDefinition,
  VisualEffect,
  VisualEffectContext,
  VisualSettings,
} from '../types'

const CONTROLS: ControlDefinition[] = [
  {
    key: 'primaryColor',
    label: 'Primary Color',
    type: 'color',
    defaultValue: '#8b5cf6',
    group: 'appearance',
  },
  {
    key: 'secondaryColor',
    label: 'Secondary Color',
    type: 'color',
    defaultValue: '#ec4899',
    group: 'appearance',
  },
  {
    key: 'opacity',
    label: 'Opacity',
    type: 'slider',
    defaultValue: 0.9,
    min: 0.1,
    max: 1,
    step: 0.05,
    group: 'appearance',
  },
  {
    key: 'idleSpeed',
    label: 'Idle Speed',
    type: 'slider',
    defaultValue: 1,
    min: 0.1,
    max: 3,
    step: 0.1,
    group: 'motion',
  },
  {
    key: 'distortion',
    label: 'Distortion',
    type: 'slider',
    defaultValue: 0.25,
    min: 0,
    max: 1,
    step: 0.05,
    group: 'motion',
  },
  {
    key: 'volumeSensitivity',
    label: 'Volume Sensitivity',
    type: 'slider',
    defaultValue: 1,
    min: 0,
    max: 2,
    step: 0.05,
    group: 'voiceResponse',
  },
  {
    key: 'bassSensitivity',
    label: 'Bass Sensitivity',
    type: 'slider',
    defaultValue: 1,
    min: 0,
    max: 2,
    step: 0.05,
    group: 'voiceResponse',
  },
  {
    key: 'trebleSensitivity',
    label: 'Treble Sensitivity',
    type: 'slider',
    defaultValue: 1,
    min: 0,
    max: 2,
    step: 0.05,
    group: 'voiceResponse',
  },
  {
    key: 'glowIntensity',
    label: 'Glow',
    type: 'slider',
    defaultValue: 1,
    min: 0,
    max: 3,
    step: 0.05,
    group: 'light',
  },
]

export const liquidOrbDefinition: EffectDefinition = {
  id: 'liquid-orb',
  name: 'LiquidOrb',
  description: 'Soft liquid AI energy orb',
  controls: CONTROLS,
}

export function createLiquidOrb(): VisualEffect {
  return new LiquidOrb()
}

export interface LiquidOrbDebugUniforms {
  uTime: number
  uVolume: number
  uBass: number
  uTreble: number
  uPitch: number
  uSpeechActivity: number
  uOpacity: number
  uDistortion: number
  uGlowIntensity: number
}

export class LiquidOrb implements VisualEffect {
  readonly id = liquidOrbDefinition.id
  readonly name = liquidOrbDefinition.name
  readonly scene = new Scene()

  private readonly primaryColor = new Color('#8b5cf6')
  private readonly secondaryColor = new Color('#ec4899')
  private mesh: Mesh<IcosahedronGeometry, ShaderMaterial> | null = null
  private material: ShaderMaterial | null = null
  private elapsed = 0
  private appliedPrimary = ''
  private appliedSecondary = ''

  init(_context: VisualEffectContext): void {
    const geometry = new IcosahedronGeometry(1, 4)
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVolume: { value: 0 },
        uBass: { value: 0 },
        uTreble: { value: 0 },
        uPitch: { value: 0 },
        uSpeechActivity: { value: 0 },
        uPrimaryColor: { value: this.primaryColor.clone() },
        uSecondaryColor: { value: this.secondaryColor.clone() },
        uOpacity: { value: 0.9 },
        uDistortion: { value: 0.25 },
        uGlowIntensity: { value: 1 },
      },
      vertexShader: liquidOrbVertexShader,
      fragmentShader: liquidOrbFragmentShader,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })

    const mesh = new Mesh(geometry, material)
    this.scene.add(mesh)
    this.mesh = mesh
    this.material = material
    this.elapsed = 0
    this.appliedPrimary = ''
    this.appliedSecondary = ''
  }

  update(audio: AudioData, deltaTime: number, settings: VisualSettings): void {
    const mesh = this.mesh
    const material = this.material
    if (!mesh || !material) {
      return
    }

    const uniforms = material.uniforms
    const volume = clamp01(audio.volume)
    const bass = clamp01(audio.bass)
    const treble = clamp01(audio.treble)
    const pitch = clamp01(audio.pitch)
    const speech = clamp01(audio.speechActivity)

    const idleSpeed = readNumber(settings.idleSpeed, 1, 0.1, 3)
    const volumeSensitivity = readNumber(settings.volumeSensitivity, 1, 0, 2)
    const bassSensitivity = readNumber(settings.bassSensitivity, 1, 0, 2)
    const trebleSensitivity = readNumber(settings.trebleSensitivity, 1, 0, 2)
    const distortion = readNumber(settings.distortion, 0.25, 0, 1)
    const glowIntensity = readNumber(settings.glowIntensity, 1, 0, 3)
    const opacity = readNumber(settings.opacity, 0.9, 0.1, 1)

    const animationScale = 0.4 + speech * 0.6
    this.elapsed += deltaTime * 0.001 * idleSpeed * animationScale

    const breathe = 1 + Math.sin(this.elapsed * 1.55) * 0.048
    const audioScale = 1 + volume * volumeSensitivity * 0.5
    const scale = breathe * audioScale
    mesh.scale.set(scale, scale, scale)
    mesh.rotation.y += deltaTime * 0.00018 * idleSpeed * animationScale

    uniforms.uTime.value = this.elapsed
    uniforms.uVolume.value = volume
    uniforms.uBass.value = bass
    uniforms.uTreble.value = treble
    uniforms.uPitch.value = pitch
    uniforms.uSpeechActivity.value = speech
    uniforms.uOpacity.value = opacity
    uniforms.uDistortion.value = clamp01(distortion + bass * bassSensitivity * 0.55)
    uniforms.uGlowIntensity.value = clampRange(glowIntensity * (1 + treble * trebleSensitivity), 0, 6)

    const primary = settings.primaryColor
    if (typeof primary === 'string' && primary !== this.appliedPrimary) {
      this.primaryColor.set(primary)
      uniforms.uPrimaryColor.value.copy(this.primaryColor)
      this.appliedPrimary = primary
    }

    const secondary = settings.secondaryColor
    if (typeof secondary === 'string' && secondary !== this.appliedSecondary) {
      this.secondaryColor.set(secondary)
      uniforms.uSecondaryColor.value.copy(this.secondaryColor)
      this.appliedSecondary = secondary
    }
  }

  resize(_width: number, _height: number): void {}

  dispose(): void {
    disposeObject3D(this.scene)
    this.scene.clear()
    this.mesh = null
    this.material = null
  }

  getDebugUniforms(): LiquidOrbDebugUniforms {
    const uniforms = this.material?.uniforms
    return {
      uTime: Number(uniforms?.uTime.value ?? 0),
      uVolume: Number(uniforms?.uVolume.value ?? 0),
      uBass: Number(uniforms?.uBass.value ?? 0),
      uTreble: Number(uniforms?.uTreble.value ?? 0),
      uPitch: Number(uniforms?.uPitch.value ?? 0),
      uSpeechActivity: Number(uniforms?.uSpeechActivity.value ?? 0),
      uOpacity: Number(uniforms?.uOpacity.value ?? 0),
      uDistortion: Number(uniforms?.uDistortion.value ?? 0),
      uGlowIntensity: Number(uniforms?.uGlowIntensity.value ?? 0),
    }
  }
}

function clamp01(value: number): number {
  return clampRange(value, 0, 1)
}

function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function readNumber(
  value: number | string | boolean | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = typeof value === 'number' ? value : fallback
  return clampRange(numeric, min, max)
}
