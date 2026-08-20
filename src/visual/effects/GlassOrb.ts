import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  Mesh,
  Scene,
  ShaderMaterial,
  SphereGeometry,
} from 'three'
import type { AudioData } from '@/audio'
import { disposeObject3D } from '../dispose'
import {
  glassOrbFragmentShader,
  glassOrbGlowFragmentShader,
  glassOrbVertexShader,
} from '../shaders/glassOrb'
import type {
  ControlDefinition,
  EffectDefinition,
  VisualEffect,
  VisualEffectContext,
  VisualSettings,
} from '../types'

const CONTROLS: ControlDefinition[] = [
  {
    key: 'rimColor',
    label: 'Rim Color',
    type: 'color',
    defaultValue: '#d946ef',
    group: 'appearance',
  },
  {
    key: 'coreColor',
    label: 'Core Color',
    type: 'color',
    defaultValue: '#c4b5fd',
    group: 'appearance',
  },
  {
    key: 'opacity',
    label: 'Opacity',
    type: 'slider',
    defaultValue: 0.85,
    min: 0.5,
    max: 1,
    step: 0.05,
    group: 'appearance',
  },
  {
    key: 'rimWidth',
    label: 'Rim Width',
    type: 'slider',
    defaultValue: 0.55,
    min: 0.2,
    max: 1.5,
    step: 0.05,
    group: 'style',
  },
  {
    key: 'refractionIntensity',
    label: 'Refraction',
    type: 'slider',
    defaultValue: 0.35,
    min: 0,
    max: 1,
    step: 0.05,
    group: 'style',
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
    key: 'speechSensitivity',
    label: 'Speech Sensitivity',
    type: 'slider',
    defaultValue: 1.2,
    min: 0,
    max: 2,
    step: 0.05,
    group: 'voiceResponse',
  },
  {
    key: 'highlightStrength',
    label: 'Highlight Strength',
    type: 'slider',
    defaultValue: 1,
    min: 0,
    max: 3,
    step: 0.05,
    group: 'light',
  },
]

export const glassOrbDefinition: EffectDefinition = {
  id: 'glass-orb',
  name: 'GlassOrb',
  description: 'Frosted glass AI energy orb',
  controls: CONTROLS,
  preferredStageStyle: 'light',
}

export function createGlassOrb(): VisualEffect {
  return new GlassOrb()
}

export interface GlassOrbDebugUniforms {
  uTime: number
  uVolume: number
  uBass: number
  uTreble: number
  uPitch: number
  uSpeechActivity: number
  uRimWidth: number
  uHighlightStrength: number
  uRefractionIntensity: number
  uOpacity: number
}

export class GlassOrb implements VisualEffect {
  readonly id = glassOrbDefinition.id
  readonly name = glassOrbDefinition.name
  readonly scene = new Scene()

  private readonly rimColor = new Color('#d946ef')
  private readonly coreColor = new Color('#c4b5fd')
  private readonly highlightColor = new Color('#fbcfe8')
  private mesh: Mesh<SphereGeometry, ShaderMaterial> | null = null
  private glow: Mesh<SphereGeometry, ShaderMaterial> | null = null
  private material: ShaderMaterial | null = null
  private glowMaterial: ShaderMaterial | null = null
  private elapsed = 0
  private appliedRim = ''
  private appliedCore = ''

  init(_context: VisualEffectContext): void {
    const uniforms = {
      uTime: { value: 0 },
      uVolume: { value: 0 },
      uBass: { value: 0 },
      uTreble: { value: 0 },
      uPitch: { value: 0 },
      uSpeechActivity: { value: 0 },
      uRimColor: { value: this.rimColor.clone() },
      uCoreColor: { value: this.coreColor.clone() },
      uHighlightColor: { value: this.highlightColor.clone() },
      uRimWidth: { value: 0.55 },
      uHighlightStrength: { value: 1 },
      uRefractionIntensity: { value: 0.35 },
      uOpacity: { value: 0.85 },
    }

    const material = new ShaderMaterial({
      uniforms,
      vertexShader: glassOrbVertexShader,
      fragmentShader: glassOrbFragmentShader,
      transparent: true,
      depthWrite: false,
      side: FrontSide,
    })

    const glowMaterial = new ShaderMaterial({
      uniforms,
      vertexShader: glassOrbVertexShader,
      fragmentShader: glassOrbGlowFragmentShader,
      transparent: true,
      depthWrite: false,
      side: BackSide,
      blending: AdditiveBlending,
    })

    const mesh = new Mesh(new SphereGeometry(1, 96, 96), material)
    const glow = new Mesh(new SphereGeometry(1, 48, 48), glowMaterial)
    glow.scale.setScalar(1.07)
    glowMaterial.uniforms = material.uniforms

    this.scene.add(glow)
    this.scene.add(mesh)
    this.mesh = mesh
    this.glow = glow
    this.material = material
    this.glowMaterial = glowMaterial
    this.elapsed = 0
    this.appliedRim = ''
    this.appliedCore = ''
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
    const speechSensitivity = readNumber(settings.speechSensitivity, 1.2, 0, 2)
    const rimWidth = readNumber(settings.rimWidth, 0.55, 0.2, 1.5)
    const refractionIntensity = readNumber(settings.refractionIntensity, 0.35, 0, 1)
    const highlightStrength = readNumber(settings.highlightStrength, 1, 0, 3)
    const opacity = readNumber(settings.opacity, 0.85, 0.5, 1)

    this.elapsed += deltaTime * 0.001 * idleSpeed

    const audioScale = 1 + volume * volumeSensitivity * 0.08
    mesh.scale.setScalar(audioScale)
    mesh.rotation.y += deltaTime * 0.00008 * idleSpeed
    if (this.glow) {
      this.glow.scale.setScalar(audioScale * 1.07)
      this.glow.rotation.copy(mesh.rotation)
    }

    uniforms.uTime.value = this.elapsed
    uniforms.uVolume.value = volume
    uniforms.uBass.value = bass
    uniforms.uTreble.value = treble
    uniforms.uPitch.value = pitch
    uniforms.uSpeechActivity.value = speech * speechSensitivity
    uniforms.uRimWidth.value = rimWidth
    uniforms.uHighlightStrength.value = highlightStrength
    uniforms.uRefractionIntensity.value = refractionIntensity
    uniforms.uOpacity.value = opacity

    const rim = settings.rimColor
    if (typeof rim === 'string' && rim !== this.appliedRim) {
      this.rimColor.set(rim)
      uniforms.uRimColor.value.copy(this.rimColor)
      this.appliedRim = rim
    }

    const core = settings.coreColor
    if (typeof core === 'string' && core !== this.appliedCore) {
      this.coreColor.set(core)
      uniforms.uCoreColor.value.copy(this.coreColor)
      this.appliedCore = core
    }
  }

  resize(_width: number, _height: number): void {}

  dispose(): void {
    disposeObject3D(this.scene)
    this.scene.clear()
    this.mesh = null
    this.glow = null
    this.material = null
    this.glowMaterial = null
  }

  getDebugUniforms(): GlassOrbDebugUniforms {
    const uniforms = this.material?.uniforms
    return {
      uTime: Number(uniforms?.uTime.value ?? 0),
      uVolume: Number(uniforms?.uVolume.value ?? 0),
      uBass: Number(uniforms?.uBass.value ?? 0),
      uTreble: Number(uniforms?.uTreble.value ?? 0),
      uPitch: Number(uniforms?.uPitch.value ?? 0),
      uSpeechActivity: Number(uniforms?.uSpeechActivity.value ?? 0),
      uRimWidth: Number(uniforms?.uRimWidth.value ?? 0),
      uHighlightStrength: Number(uniforms?.uHighlightStrength.value ?? 0),
      uRefractionIntensity: Number(uniforms?.uRefractionIntensity.value ?? 0),
      uOpacity: Number(uniforms?.uOpacity.value ?? 0),
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
