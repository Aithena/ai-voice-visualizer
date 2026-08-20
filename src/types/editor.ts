export type EffectId = 'liquid-orb' | 'glass-wave' | 'energy-core'

export interface EffectOption {
  id: EffectId
  name: string
  description: string
}

export const EFFECT_OPTIONS: readonly EffectOption[] = [
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
