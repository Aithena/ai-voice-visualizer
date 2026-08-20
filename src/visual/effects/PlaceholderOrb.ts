import {
  AmbientLight,
  Color,
  DirectionalLight,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from 'three'
import type { AudioData } from '@/audio'
import { disposeObject3D } from '../dispose'
import type {
  ControlDefinition,
  EffectDefinition,
  VisualEffect,
  VisualEffectContext,
  VisualSettings,
} from '../types'

const AMBIENT_LEVELS = {
  dim: 0.18,
  normal: 0.45,
  bright: 0.85,
} as const

const CONTROLS: ControlDefinition[] = [
  {
    key: 'primaryColor',
    label: 'Primary Color',
    type: 'color',
    defaultValue: '#c4c7d4',
    group: 'appearance',
  },
  {
    key: 'wireframe',
    label: 'Wireframe',
    type: 'switch',
    defaultValue: false,
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
    key: 'keyLightIntensity',
    label: 'Key Light',
    type: 'slider',
    defaultValue: 0.9,
    min: 0,
    max: 3,
    step: 0.05,
    group: 'light',
  },
  {
    key: 'ambientLevel',
    label: 'Ambient',
    type: 'select',
    defaultValue: 'normal',
    options: [
      { label: 'Dim', value: 'dim' },
      { label: 'Normal', value: 'normal' },
      { label: 'Bright', value: 'bright' },
    ],
    group: 'light',
  },
]

export const placeholderOrbDefinition: EffectDefinition = {
  id: 'placeholder-orb',
  name: 'PlaceholderOrb',
  description: 'Reference orb for visual runtime verification',
  controls: CONTROLS,
}

export function createPlaceholderOrb(): VisualEffect {
  return new PlaceholderOrb()
}

class PlaceholderOrb implements VisualEffect {
  readonly id = placeholderOrbDefinition.id
  readonly name = placeholderOrbDefinition.name
  readonly scene = new Scene()

  private readonly color = new Color('#c4c7d4')
  private material: MeshStandardMaterial | null = null
  private mesh: Mesh<IcosahedronGeometry, MeshStandardMaterial> | null = null
  private ambient: AmbientLight | null = null
  private keyLight: DirectionalLight | null = null
  private elapsed = 0
  private appliedColor = ''
  private appliedWireframe: boolean | null = null
  private appliedKeyLight = Number.NaN
  private appliedAmbient = ''

  init(_context: VisualEffectContext): void {
    const geometry = new IcosahedronGeometry(1, 1)
    const material = new MeshStandardMaterial({
      color: this.color,
      roughness: 0.35,
      metalness: 0.08,
    })
    const mesh = new Mesh(geometry, material)
    const ambient = new AmbientLight(0xffffff, AMBIENT_LEVELS.normal)
    const keyLight = new DirectionalLight(0xffffff, 0.9)
    keyLight.position.set(2.2, 3.2, 4)

    this.scene.add(ambient, keyLight, mesh)
    this.material = material
    this.mesh = mesh
    this.ambient = ambient
    this.keyLight = keyLight
    this.elapsed = 0
    this.appliedColor = ''
    this.appliedWireframe = null
    this.appliedKeyLight = Number.NaN
    this.appliedAmbient = ''
  }

  update(audio: AudioData, deltaTime: number, settings: VisualSettings): void {
    const mesh = this.mesh
    const material = this.material
    const ambient = this.ambient
    const keyLight = this.keyLight
    if (!mesh || !material || !ambient || !keyLight) {
      return
    }

    const idleSpeed = readNumber(settings.idleSpeed, 1)
    const volumeSensitivity = readNumber(settings.volumeSensitivity, 1)
    this.elapsed += deltaTime * 0.001 * idleSpeed

    const breathe = 1 + Math.sin(this.elapsed * 1.6) * 0.045
    const audioScale = 1 + audio.volume * 0.55 * volumeSensitivity
    const scale = breathe * audioScale
    mesh.scale.set(scale, scale, scale)
    mesh.rotation.y += deltaTime * 0.00045 * idleSpeed
    mesh.rotation.x += deltaTime * 0.00012 * idleSpeed

    const primaryColor = settings.primaryColor
    if (typeof primaryColor === 'string' && primaryColor !== this.appliedColor) {
      this.color.set(primaryColor)
      material.color.copy(this.color)
      this.appliedColor = primaryColor
    }

    const wireframe = settings.wireframe === true
    if (wireframe !== this.appliedWireframe) {
      material.wireframe = wireframe
      this.appliedWireframe = wireframe
    }

    const keyLightIntensity = readNumber(settings.keyLightIntensity, 0.9)
    if (keyLightIntensity !== this.appliedKeyLight) {
      keyLight.intensity = keyLightIntensity
      this.appliedKeyLight = keyLightIntensity
    }

    const ambientLevel = typeof settings.ambientLevel === 'string' ? settings.ambientLevel : 'normal'
    if (ambientLevel !== this.appliedAmbient) {
      ambient.intensity = readAmbientLevel(ambientLevel)
      this.appliedAmbient = ambientLevel
    }
  }

  resize(_width: number, _height: number): void {}

  dispose(): void {
    disposeObject3D(this.scene)
    this.scene.clear()
    this.material = null
    this.mesh = null
    this.ambient = null
    this.keyLight = null
  }
}

function readNumber(value: number | string | boolean | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readAmbientLevel(value: string): number {
  if (value === 'dim' || value === 'normal' || value === 'bright') {
    return AMBIENT_LEVELS[value]
  }
  return AMBIENT_LEVELS.normal
}
