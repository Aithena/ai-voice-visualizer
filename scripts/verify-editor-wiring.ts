import { createPinia, setActivePinia } from 'pinia'
import { defaultSettings } from '../src/visual/settings'
import { placeholderOrbDefinition } from '../src/visual/effects/PlaceholderOrb'
import { isMissingSelectOptions, isValidSelectDefault } from '../src/types/editor'
import { useEditorStore } from '../src/stores/editor'

function runEditorWiringSelfCheck(): void {
  const settings = defaultSettings(placeholderOrbDefinition.controls)
  const keys = [
    'primaryColor',
    'wireframe',
    'idleSpeed',
    'volumeSensitivity',
    'keyLightIntensity',
    'ambientLevel',
  ]

  for (const key of keys) {
    if (!(key in settings)) {
      throw new Error(`defaultSettings missing ${key}`)
    }
  }

  for (const control of placeholderOrbDefinition.controls) {
    if (!isValidSelectDefault(control)) {
      throw new Error(`select default is not in options: ${control.key}`)
    }
  }

  const dirtySelect = {
    type: 'select',
    defaultValue: 'normal',
  }
  if (!isMissingSelectOptions(dirtySelect)) {
    throw new Error('select without options should be dirty schema')
  }
  if (isMissingSelectOptions(placeholderOrbDefinition.controls.find((item) => item.key === 'ambientLevel')!)) {
    throw new Error('ambientLevel should not be dirty schema')
  }

  setActivePinia(createPinia())
  const store = useEditorStore()
  store.syncAvailableEffects(['placeholder-orb'], 'placeholder-orb')
  store.syncEffectDefinition(placeholderOrbDefinition, settings)

  const beforeId = store.selectedEffectId
  store.selectEffect('liquid-orb')
  if (store.selectedEffectId !== beforeId) {
    throw new Error('selectEffect should ignore unavailable ids')
  }

  store.selectEffect('placeholder-orb')
  if (store.selectedEffectId !== 'placeholder-orb') {
    throw new Error('selectEffect should accept available ids')
  }

  const beforeColor = store.settings.primaryColor
  store.updateSetting('not-a-real-key', '#ff0000')
  if (store.settings.primaryColor !== beforeColor || 'not-a-real-key' in store.settings) {
    throw new Error('updateSetting should ignore unknown keys')
  }

  store.updateSetting('idleSpeed', 2)
  if (store.settings.idleSpeed !== 2) {
    throw new Error('updateSetting should write known keys')
  }

  store.resetEffectSettings()
  if (store.settings.idleSpeed !== 1) {
    throw new Error('resetEffectSettings should restore defaults')
  }
}

runEditorWiringSelfCheck()
console.log('Editor wiring self-check passed')
