<script setup lang="ts">
import { ElButton } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
const { stageStyle } = storeToRefs(editorStore)

function setDark(): void {
  editorStore.setStageStyle('dark')
}

function setLight(): void {
  editorStore.setStageStyle('light')
}

function openInspector(): void {
  editorStore.setInspectorOpen(true)
}
</script>

<template>
  <header class="header">
    <div class="header__brand">
      <span class="header__mark" aria-hidden="true" />
      <span class="header__title">AI Voice Visualizer</span>
    </div>

    <div class="header__actions">
      <ElButton class="header__mobile-inspector" text @click="openInspector">
        Inspector
      </ElButton>
      <div class="header__stage" role="group" aria-label="Stage background">
        <button
          class="header__toggle"
          type="button"
          :class="{ 'is-on': stageStyle === 'dark' }"
          :aria-pressed="stageStyle === 'dark'"
          @click="setDark"
        >
          Dark
        </button>
        <button
          class="header__toggle"
          type="button"
          :class="{ 'is-on': stageStyle === 'light' }"
          :aria-pressed="stageStyle === 'light'"
          @click="setLight"
        >
          Light
        </button>
      </div>
      <ElButton disabled>Mic</ElButton>
      <ElButton @click="editorStore.resetEffectSettings()">Reset</ElButton>
      <ElButton disabled>Export</ElButton>
    </div>
  </header>
</template>

<style scoped lang="less">
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background: var(--color-bg-panel);
  border-bottom: 1px solid var(--color-border);
}

.header__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.header__mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  opacity: 0.7;
}

.header__title {
  overflow: hidden;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.header__stage {
  display: inline-flex;
  align-items: center;
  margin-right: var(--space-1);
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.header__toggle {
  padding: 4px 10px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.header__toggle.is-on {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.header__mobile-inspector {
  display: none;
}

@media (max-width: 960px) {
  .header__mobile-inspector {
    display: inline-flex;
  }
}
</style>
