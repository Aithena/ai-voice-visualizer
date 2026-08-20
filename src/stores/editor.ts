import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { EFFECT_OPTIONS, type EffectId, type EffectOption } from '@/types/editor'

export const useEditorStore = defineStore('editor', () => {
  const selectedEffectId = ref<EffectId>('liquid-orb')
  const inspectorOpen = ref(false)

  const selectedEffect = computed<EffectOption>(() => {
    const match = EFFECT_OPTIONS.find((effect) => effect.id === selectedEffectId.value)
    return match ?? EFFECT_OPTIONS[0]
  })

  function selectEffect(id: EffectId): void {
    selectedEffectId.value = id
  }

  function setInspectorOpen(open: boolean): void {
    inspectorOpen.value = open
  }

  return {
    selectedEffectId,
    selectedEffect,
    inspectorOpen,
    selectEffect,
    setInspectorOpen,
  }
})
