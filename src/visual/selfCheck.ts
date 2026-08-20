import { createPlaceholderOrb, placeholderOrbDefinition } from './effects/PlaceholderOrb'
import { VisualEngineError } from './errors'
import { EffectRegistry } from './registry'
import { defaultSettings, mergeSettings } from './settings'

export function runVisualFoundationSelfCheck(): void {
  const settings = defaultSettings(placeholderOrbDefinition.controls)
  assertEqual('default primaryColor', settings.primaryColor, '#c4c7d4')
  assertEqual('default idleSpeed', settings.idleSpeed, 1)

  mergeSettings(settings, { idleSpeed: 2, unknownKey: 'nope', primaryColor: '#8899aa' })
  assertEqual('merged idleSpeed', settings.idleSpeed, 2)
  assertEqual('merged primaryColor', settings.primaryColor, '#8899aa')
  assertEqual('unknown key ignored', Object.prototype.hasOwnProperty.call(settings, 'unknownKey'), false)

  mergeSettings(settings, { idleSpeed: undefined })
  assertEqual('undefined value ignored', settings.idleSpeed, 2)

  const registry = new EffectRegistry()
  registry.register(placeholderOrbDefinition, createPlaceholderOrb)
  assertEqual('registered id', registry.has(placeholderOrbDefinition.id), true)
  assertEqual('ids length', registry.ids().length, 1)
  assertEqual('ids value', registry.ids()[0], placeholderOrbDefinition.id)

  try {
    registry.register(placeholderOrbDefinition, createPlaceholderOrb)
    throw new Error('expected duplicate register to throw')
  } catch (error) {
    assertEngineError(error, 'DUPLICATE_EFFECT')
  }

  try {
    registry.get('missing-effect')
    throw new Error('expected missing effect to throw')
  } catch (error) {
    assertEngineError(error, 'EFFECT_NOT_REGISTERED')
  }

  const effect = createPlaceholderOrb()
  assertEqual('placeholder id', effect.id, 'placeholder-orb')
  assertEqual('placeholder name', effect.name, 'PlaceholderOrb')
  effect.dispose()
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`)
  }
}

function assertEngineError(error: unknown, code: string): void {
  if (!(error instanceof VisualEngineError) || error.code !== code) {
    throw new Error(`expected VisualEngineError(${code}), received ${String(error)}`)
  }
}
