import { VisualEngineError } from './errors'
import type { EffectDefinition, EffectFactory } from './types'

export interface RegisteredEffect {
  definition: EffectDefinition
  factory: EffectFactory
}

export class EffectRegistry {
  private readonly entries = new Map<string, RegisteredEffect>()

  register(definition: EffectDefinition, factory: EffectFactory): void {
    if (this.entries.has(definition.id)) {
      throw new VisualEngineError(
        'DUPLICATE_EFFECT',
        `Effect "${definition.id}" is already registered`,
      )
    }
    this.entries.set(definition.id, { definition, factory })
  }

  get(effectId: string): RegisteredEffect {
    const entry = this.entries.get(effectId)
    if (!entry) {
      throw new VisualEngineError('EFFECT_NOT_REGISTERED', `Effect "${effectId}" is not registered`)
    }
    return entry
  }

  has(effectId: string): boolean {
    return this.entries.has(effectId)
  }

  ids(): string[] {
    return [...this.entries.keys()]
  }
}
