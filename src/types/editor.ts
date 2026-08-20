export type EffectId = 'placeholder-orb' | 'liquid-orb' | 'glass-wave' | 'energy-core'

export interface EffectOption {
  id: EffectId
  name: string
  description: string
}

export const EFFECT_OPTIONS: readonly EffectOption[] = [
  {
    id: 'placeholder-orb',
    name: 'PlaceholderOrb',
    description: 'Reference',
  },
  {
    id: 'liquid-orb',
    name: 'LiquidOrb',
    description: 'Soft liquid energy',
  },
  {
    id: 'glass-wave',
    name: 'GlassWave',
    description: 'Refracted glass surface',
  },
  {
    id: 'energy-core',
    name: 'EnergyCore',
    description: 'Dense reactive core',
  },
] as const

export function isEffectId(value: string): value is EffectId {
  return EFFECT_OPTIONS.some((option) => option.id === value)
}

export function isMissingSelectOptions(control: {
  type: string
  options?: ReadonlyArray<{ label: string; value: string }>
}): boolean {
  return control.type === 'select' && (!control.options || control.options.length === 0)
}

export function isValidSelectDefault(control: {
  type: string
  defaultValue: number | string | boolean
  options?: ReadonlyArray<{ label: string; value: string }>
}): boolean {
  if (control.type !== 'select') {
    return true
  }
  if (!control.options || control.options.length === 0) {
    return false
  }
  return control.options.some((option) => option.value === control.defaultValue)
}
