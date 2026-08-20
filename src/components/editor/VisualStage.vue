<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { isEffectId, type EffectId } from '@/types/editor'
import { useEditorStore } from '@/stores/editor'
import {
  VisualEngine,
  VisualEngineError,
  createLiquidOrb,
  createPlaceholderOrb,
  liquidOrbDefinition,
  placeholderOrbDefinition,
} from '@/visual'

const editorStore = useEditorStore()
const { selectedEffectId, settings, selectedEffect } = storeToRefs(editorStore)

const viewport = ref<HTMLElement | null>(null)
const errorMessage = ref<string | null>(null)

let engine: VisualEngine | null = null
let observer: ResizeObserver | null = null
let stopSelectedWatch: (() => void) | undefined
let stopSettingsWatch: (() => void) | undefined
let lastGoodEffectId: EffectId | null = null
let skipSelectionWatch = false
let suppressSettingsWatch = false

function applyCurrentEffect(): void {
  if (!engine) {
    return
  }

  const effectId = selectedEffectId.value
  try {
    engine.setEffect(effectId)
    suppressSettingsWatch = true
    editorStore.syncEffectDefinition(engine.getEffectDefinition(effectId), engine.getSettings())
    lastGoodEffectId = effectId
    errorMessage.value = null
    void nextTick(() => {
      suppressSettingsWatch = false
    })
  } catch (error) {
    const code = error instanceof VisualEngineError ? error.code : 'UNKNOWN'
    console.error(`[VisualStage] failed to set effect "${effectId}" (${code})`, error)
    errorMessage.value = `Failed to load ${effectId}`

    const fallbackId = resolveFallback(effectId)
    if (!fallbackId || !engine) {
      return
    }

    try {
      engine.setEffect(fallbackId)
      suppressSettingsWatch = true
      editorStore.syncEffectDefinition(engine.getEffectDefinition(fallbackId), engine.getSettings())
      lastGoodEffectId = fallbackId
      skipSelectionWatch = true
      editorStore.selectEffect(fallbackId)
      void nextTick(() => {
        suppressSettingsWatch = false
      })
    } catch (restoreError) {
      console.error(`[VisualStage] failed to restore effect "${fallbackId}"`, restoreError)
    }
  }
}

function resolveFallback(failedId: EffectId): EffectId | null {
  if (lastGoodEffectId && lastGoodEffectId !== failedId) {
    return lastGoodEffectId
  }
  if (failedId !== 'placeholder-orb' && engine?.getEffectIds().includes('placeholder-orb')) {
    return 'placeholder-orb'
  }
  return null
}

onMounted(() => {
  const container = viewport.value
  if (!container) {
    return
  }

  try {
    engine = new VisualEngine(container)
    engine.registerEffect(liquidOrbDefinition, createLiquidOrb)
    engine.registerEffect(placeholderOrbDefinition, createPlaceholderOrb)

    const availableIds = engine.getEffectIds().filter(isEffectId)
    const defaultId = availableIds[0] ?? liquidOrbDefinition.id
    editorStore.syncAvailableEffects(availableIds, defaultId)
    applyCurrentEffect()
    engine.resize(container.clientWidth, container.clientHeight)
    engine.start()

    observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !engine) {
        return
      }
      engine.resize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(container)

    stopSelectedWatch = watch(selectedEffectId, () => {
      if (skipSelectionWatch) {
        skipSelectionWatch = false
        return
      }
      applyCurrentEffect()
    })

    stopSettingsWatch = watch(
      settings,
      (value) => {
        if (suppressSettingsWatch) {
          return
        }
        engine?.updateSettings(value)
      },
      { deep: true },
    )
  } catch (error) {
    engine?.dispose()
    engine = null
    errorMessage.value =
      error instanceof VisualEngineError
        ? error.message
        : 'Failed to initialize the visual runtime'
  }
})

onBeforeUnmount(() => {
  stopSelectedWatch?.()
  stopSettingsWatch?.()
  observer?.disconnect()
  observer = null
  engine?.dispose()
  engine = null
})
</script>

<template>
  <section class="stage" aria-label="Visual Stage">
    <p class="stage__label">Visual Stage</p>
    <div ref="viewport" class="stage__viewport" />
    <p v-if="errorMessage" class="stage__error">{{ errorMessage }}</p>
    <p v-else class="stage__effect">{{ selectedEffect.name }}</p>
  </section>
</template>

<style scoped lang="less">
.stage {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  background: var(--color-bg-stage);
}

.stage__viewport {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.stage__label,
.stage__effect,
.stage__error {
  position: absolute;
  z-index: 1;
  margin: 0;
  pointer-events: none;
}

.stage__label {
  top: var(--space-4);
  left: var(--space-4);
  color: var(--color-text-faint);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.stage__effect {
  right: var(--space-4);
  bottom: var(--space-4);
  color: var(--color-text-muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.stage__error {
  right: var(--space-4);
  bottom: var(--space-4);
  left: var(--space-4);
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
