import type * as THREE from 'three'
import type { AudioData } from '@/audio'

export type ControlGroup = 'appearance' | 'motion' | 'voiceResponse' | 'light'

export type ControlType = 'slider' | 'color' | 'switch' | 'select'

export interface ControlSelectOption {
  label: string
  value: string
}

export interface ControlDefinition {
  key: string
  label: string
  type: ControlType
  defaultValue: number | string | boolean
  min?: number
  max?: number
  step?: number
  /** type === 'select' 时必填；其他 type 忽略 */
  options?: ReadonlyArray<ControlSelectOption>
  group: ControlGroup
}

export type VisualSettings = Readonly<Record<string, number | string | boolean>>

export type VisualSettingsRecord = Record<string, number | string | boolean>

export interface EffectDefinition {
  id: string
  name: string
  description?: string
  controls: ControlDefinition[]
}

export interface VisualEffectContext {
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  width: number
  height: number
}

export interface VisualEffect {
  readonly id: string
  readonly name: string
  readonly scene: THREE.Scene
  init(context: VisualEffectContext): void
  update(audio: AudioData, deltaTime: number, settings: VisualSettings): void
  resize(width: number, height: number): void
  dispose(): void
}

export type EffectFactory = () => VisualEffect

export type AudioProvider = () => AudioData

export interface VisualEngineOptions {
  audioProvider?: AudioProvider
}

export type VisualEngineErrorCode =
  | 'WEBGL_UNAVAILABLE'
  | 'EFFECT_NOT_REGISTERED'
  | 'DUPLICATE_EFFECT'
  | 'INIT_FAILED'
  | 'DISPOSED'
