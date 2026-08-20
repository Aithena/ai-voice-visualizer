<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElColorPicker, ElOption, ElSelect, ElSlider, ElSwitch } from 'element-plus'
import { isMissingSelectOptions } from '@/types/editor'
import { useEditorStore } from '@/stores/editor'

const GROUP_ORDER = [
  { id: 'style', label: 'Style' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'motion', label: 'Motion' },
  { id: 'voiceResponse', label: 'Voice Response' },
  { id: 'light', label: 'Light' },
] as const

const warnedSelectKeys = new Set<string>()

const editorStore = useEditorStore()
const { currentDefinition, settings } = storeToRefs(editorStore)

const groupedControls = computed(() => {
  const definition = currentDefinition.value
  if (!definition) {
    return []
  }

  return GROUP_ORDER.map((group) => ({
    ...group,
    controls: definition.controls.filter((control) => control.group === group.id),
  })).filter((group) => group.controls.length > 0)
})

watch(
  currentDefinition,
  (definition) => {
    definition?.controls.forEach((control) => {
      if (isMissingSelectOptions(control)) {
        warnDirtySelect(control.key)
      }
    })
  },
  { immediate: true },
)

function warnDirtySelect(key: string): void {
  if (warnedSelectKeys.has(key)) {
    return
  }
  warnedSelectKeys.add(key)
  console.warn(`[Inspector] select control "${key}" is missing options`)
}

function onSliderChange(key: string, value: number | number[]): void {
  if (typeof value === 'number') {
    editorStore.updateSetting(key, value)
  }
}

function onColorChange(key: string, value: string | null): void {
  if (typeof value === 'string') {
    editorStore.updateSetting(key, value)
  }
}

function onSwitchChange(key: string, value: boolean | string | number): void {
  editorStore.updateSetting(key, Boolean(value))
}

function onSelectChange(key: string, value: string | number | boolean | undefined): void {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    editorStore.updateSetting(key, value)
  }
}
</script>

<template>
  <aside class="inspector" aria-label="Inspector">
    <h2 class="inspector__title">Inspector</h2>

    <p v-if="!currentDefinition" class="inspector__hint">No effect selected.</p>

    <template v-else>
      <section v-for="group in groupedControls" :key="group.id" class="inspector__group">
        <h3 class="inspector__group-title">{{ group.label }}</h3>

        <div v-for="control in group.controls" :key="control.key" class="inspector__row">
          <label class="inspector__label" :for="`control-${control.key}`">{{ control.label }}</label>

          <ElSlider
            v-if="control.type === 'slider'"
            :id="`control-${control.key}`"
            :model-value="Number(settings[control.key] ?? control.defaultValue)"
            :min="control.min ?? 0"
            :max="control.max ?? 1"
            :step="control.step ?? 0.01"
            :show-tooltip="false"
            @update:model-value="(value) => onSliderChange(control.key, value)"
          />

          <ElColorPicker
            v-else-if="control.type === 'color'"
            :id="`control-${control.key}`"
            :model-value="String(settings[control.key] ?? control.defaultValue)"
            size="small"
            @update:model-value="(value) => onColorChange(control.key, value)"
          />

          <ElSwitch
            v-else-if="control.type === 'switch'"
            :id="`control-${control.key}`"
            :model-value="Boolean(settings[control.key])"
            @update:model-value="(value) => onSwitchChange(control.key, value)"
          />

          <ElSelect
            v-else-if="control.type === 'select' && !isMissingSelectOptions(control)"
            :id="`control-${control.key}`"
            :model-value="String(settings[control.key] ?? control.defaultValue)"
            size="small"
            @update:model-value="(value) => onSelectChange(control.key, value)"
          >
            <ElOption
              v-for="option in control.options"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>

          <ElSelect
            v-else-if="control.type === 'select'"
            :id="`control-${control.key}`"
            disabled
            :model-value="String(settings[control.key] ?? '')"
            size="small"
          />
        </div>
      </section>
    </template>
  </aside>
</template>

<style scoped lang="less">
.inspector {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: auto;
  background: var(--color-bg-panel);
  border-left: 1px solid var(--color-border);
}

.inspector__title {
  margin: 0;
  padding: var(--space-4) var(--space-4) var(--space-2);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.inspector__hint {
  margin: 0 var(--space-4) var(--space-4);
  color: var(--color-text-faint);
  font-size: 12px;
}

.inspector__group {
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.inspector__group-title {
  margin: 0 0 var(--space-3);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.inspector__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.inspector__row:last-child {
  margin-bottom: 0;
}

.inspector__label {
  color: var(--color-text-muted);
  font-size: 12px;
}

.inspector :deep(.el-slider) {
  padding: 0 4px;
}

.inspector :deep(.el-select) {
  width: 100%;
}

@media (max-width: 960px) {
  .inspector {
    border-left: 0;
  }
}
</style>
