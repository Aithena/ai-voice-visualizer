import {
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import type { AudioData } from '@/audio'
import { VisualEngineError } from './errors'
import { EffectRegistry } from './registry'
import { defaultSettings, mergeSettings } from './settings'
import type {
  AudioProvider,
  EffectDefinition,
  EffectFactory,
  VisualEffect,
  VisualEffectContext,
  VisualEngineOptions,
  VisualSettingsRecord,
} from './types'

const MAX_DELTA_MS = 100
const MAX_PIXEL_RATIO = 2

const SILENT_AUDIO: AudioData = Object.freeze({
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  pitch: 0,
  speechActivity: 0,
})

export class VisualEngine {
  private readonly audioProvider?: AudioProvider
  private readonly onEffectSelected?: (definition: EffectDefinition) => void
  private readonly registry = new EffectRegistry()
  private readonly camera: PerspectiveCamera
  private readonly context: VisualEffectContext
  private renderer: WebGLRenderer | null
  private effect: VisualEffect | null = null
  private currentEffectId: string | null = null
  private settings: VisualSettingsRecord = {}
  private rafId = 0
  private running = false
  private disposed = false
  private skipRender = false
  private lastTime = 0

  constructor(container: HTMLElement, options: VisualEngineOptions = {}) {
    this.audioProvider = options.audioProvider
    this.onEffectSelected = options.onEffectSelected

    const renderer = createRenderer(container)
    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 0, 4)

    this.renderer = renderer
    this.camera = camera
    this.context = {
      renderer,
      camera,
      width: 1,
      height: 1,
    }
  }

  registerEffect(definition: EffectDefinition, factory: EffectFactory): void {
    this.assertActive()
    this.registry.register(definition, factory)
  }

  getEffectIds(): string[] {
    return this.registry.ids()
  }

  getEffectDefinition(effectId: string): EffectDefinition {
    this.assertActive()
    return this.registry.get(effectId).definition
  }

  setEffect(effectId: string): void {
    this.assertActive()
    const entry = this.registry.get(effectId)
    this.disposeCurrentEffect()

    let next: VisualEffect | null = null
    try {
      next = entry.factory()
      next.init(this.context)
    } catch (error) {
      next?.dispose()
      this.currentEffectId = null
      this.settings = {}
      throw new VisualEngineError('INIT_FAILED', `Effect "${effectId}" failed to initialize`, {
        cause: error,
      })
    }

    this.effect = next
    this.currentEffectId = effectId
    this.settings = defaultSettings(entry.definition.controls)
    this.onEffectSelected?.(entry.definition)
  }

  getCurrentEffectId(): string | null {
    return this.currentEffectId
  }

  getSettings(): VisualSettingsRecord {
    return { ...this.settings }
  }

  updateSettings(partial: Partial<VisualSettingsRecord>): void {
    if (this.disposed || !this.currentEffectId) {
      return
    }
    mergeSettings(this.settings, partial)
  }

  resetSettings(): void {
    if (this.disposed || !this.currentEffectId) {
      return
    }
    const entry = this.registry.get(this.currentEffectId)
    this.settings = defaultSettings(entry.definition.controls)
  }

  start(): void {
    if (this.disposed || this.running) {
      return
    }
    this.running = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.onFrame)
  }

  stop(): void {
    this.running = false
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  isRunning(): boolean {
    return this.running
  }

  resize(width: number, height: number): void {
    if (this.disposed || !this.renderer) {
      return
    }
    if (width <= 0 || height <= 0) {
      this.skipRender = true
      return
    }

    this.skipRender = false
    this.context.width = width
    this.context.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.effect?.resize(width, height)
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.stop()
    this.disposeCurrentEffect()

    const renderer = this.renderer
    this.renderer = null
    this.disposed = true

    if (!renderer) {
      return
    }

    renderer.forceContextLoss()
    renderer.dispose()
    renderer.domElement.remove()
  }

  private readonly onFrame = (now: number): void => {
    if (!this.running || this.disposed) {
      this.rafId = 0
      return
    }

    this.rafId = requestAnimationFrame(this.onFrame)

    let deltaTime = now - this.lastTime
    this.lastTime = now
    if (deltaTime < 0) {
      deltaTime = 0
    } else if (deltaTime > MAX_DELTA_MS) {
      deltaTime = MAX_DELTA_MS
    }

    const renderer = this.renderer
    const effect = this.effect
    if (this.skipRender || !renderer || !effect) {
      return
    }

    effect.update(this.readAudio(), deltaTime, this.settings)
    renderer.render(effect.scene, this.camera)
  }

  private readAudio(): AudioData {
    if (!this.audioProvider) {
      return SILENT_AUDIO
    }
    try {
      return this.audioProvider()
    } catch {
      return SILENT_AUDIO
    }
  }

  private disposeCurrentEffect(): void {
    const effect = this.effect
    this.effect = null
    this.currentEffectId = null
    this.settings = {}
    effect?.dispose()
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new VisualEngineError('DISPOSED', 'VisualEngine has been disposed')
    }
  }
}

function createRenderer(container: HTMLElement): WebGLRenderer {
  const canvas = document.createElement('canvas')
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  container.appendChild(canvas)

  try {
    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    const gl = renderer.getContext()
    if (!gl) {
      throw new VisualEngineError('WEBGL_UNAVAILABLE', 'WebGL context is not available')
    }

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
    renderer.outputColorSpace = SRGBColorSpace
    return renderer
  } catch (error) {
    canvas.remove()
    if (error instanceof VisualEngineError) {
      throw error
    }
    throw new VisualEngineError('WEBGL_UNAVAILABLE', 'Failed to initialize WebGL renderer', {
      cause: error,
    })
  }
}
