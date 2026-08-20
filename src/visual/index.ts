export { VisualEngine } from './VisualEngine'
export { VisualEngineError } from './errors'
export { defaultSettings, mergeSettings } from './settings'
export { EffectRegistry } from './registry'
export { createPlaceholderOrb, placeholderOrbDefinition } from './effects/PlaceholderOrb'
export { createLiquidOrb, liquidOrbDefinition, LiquidOrb } from './effects/LiquidOrb'
export type {
  AudioProvider,
  ControlDefinition,
  ControlGroup,
  ControlSelectOption,
  ControlType,
  EffectDefinition,
  EffectFactory,
  VisualEffect,
  VisualEffectContext,
  VisualEngineErrorCode,
  VisualEngineOptions,
  VisualSettings,
  VisualSettingsRecord,
} from './types'
