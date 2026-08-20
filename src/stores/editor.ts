import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  EFFECT_OPTIONS,
  isEffectId,
  type EffectId,
  type EffectOption,
} from '../types/editor'
import { defaultSettings } from '../visual/settings'
import type { EffectDefinition, VisualSettingsRecord } from '../visual/types'

export const useEditorStore = defineStore('editor', () => {
  const selectedEffectId = ref<EffectId>('placeholder-orb')
  const availableEffectIds = ref<EffectId[]>([])
  const currentDefinition = ref<EffectDefinition | null>(null)
  const settings = ref<VisualSettingsRecord>({})
  const inspectorOpen = ref(false)

  const selectedEffect = computed<EffectOption>(() => {
    const match = EFFECT_OPTIONS.find((effect) => effect.id === selectedEffectId.value)
    return match ?? EFFECT_OPTIONS[0]
  })

  const availableEffectIdSet = computed(() => new Set(availableEffectIds.value))

  function isEffectAvailable(id: EffectId): boolean {
    return availableEffectIdSet.value.has(id)
  }

  function selectEffect(id: EffectId): void {
    if (!isEffectAvailable(id)) {
      return
    }
    selectedEffectId.value = id
  }

  function updateSetting(key: string, value: number | string | boolean): void {
    const definition = currentDefinition.value
    if (!definition || !definition.controls.some((control) => control.key === key)) {
      return
    }
    settings.value[key] = value
  }

  function resetEffectSettings(): void {
    const definition = currentDefinition.value
    if (!definition) {
      return
    }
    settings.value = defaultSettings(definition.controls)
  }

  function syncAvailableEffects(ids: readonly string[], defaultSelectedId: string): void {
    const available = ids.filter(isEffectId)
    availableEffectIds.value = available

    if (available.includes(selectedEffectId.value)) {
      return
    }

    const fallback = isEffectId(defaultSelectedId) && available.includes(defaultSelectedId)
      ? defaultSelectedId
      : available[0]

    if (fallback) {
      selectedEffectId.value = fallback
    }
  }

  function syncEffectDefinition(
    definition: EffectDefinition,
    nextSettings: VisualSettingsRecord,
  ): void {
    currentDefinition.value = definition
    settings.value = { ...nextSettings }
  }

  function setInspectorOpen(open: boolean): void {
    inspectorOpen.value = open
  }

  return {
    selectedEffectId,
    availableEffectIds,
    currentDefinition,
    settings,
    inspectorOpen,
    selectedEffect,
    isEffectAvailable,
    selectEffect,
    updateSetting,
    resetEffectSettings,
    syncAvailableEffects,
    syncEffectDefinition,
    setInspectorOpen,
  }
})
