import type { ControlDefinition, VisualSettingsRecord } from './types'

export function defaultSettings(controls: readonly ControlDefinition[]): VisualSettingsRecord {
  const settings: VisualSettingsRecord = {}
  for (const control of controls) {
    settings[control.key] = control.defaultValue
  }
  return settings
}

export function mergeSettings(
  current: VisualSettingsRecord,
  partial: Partial<VisualSettingsRecord>,
): void {
  for (const key in partial) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      continue
    }
    const value = partial[key]
    if (value === undefined) {
      continue
    }
    current[key] = value
  }
}
