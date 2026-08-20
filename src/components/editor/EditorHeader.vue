<script setup lang="ts">
import { ElButton } from 'element-plus'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()

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
      <ElButton disabled>Mic</ElButton>
      <ElButton disabled>Reset</ElButton>
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

.header__mobile-inspector {
  display: none;
}

@media (max-width: 960px) {
  .header__mobile-inspector {
    display: inline-flex;
  }
}
</style>
