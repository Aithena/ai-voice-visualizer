<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { EFFECT_OPTIONS, type EffectId } from '@/types/editor'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
const { selectedEffectId } = storeToRefs(editorStore)

function onSelect(id: EffectId): void {
  editorStore.selectEffect(id)
}
</script>

<template>
  <aside class="selector" aria-label="Effect Selector">
    <h2 class="selector__title">Effects</h2>
    <ul class="selector__list">
      <li v-for="effect in EFFECT_OPTIONS" :key="effect.id">
        <button
          class="selector__item"
          type="button"
          :class="{
            'is-active': effect.id === selectedEffectId,
            'is-disabled': !editorStore.isEffectAvailable(effect.id),
          }"
          :disabled="!editorStore.isEffectAvailable(effect.id)"
          :aria-pressed="effect.id === selectedEffectId"
          :aria-disabled="!editorStore.isEffectAvailable(effect.id)"
          @click="onSelect(effect.id)"
        >
          <span class="selector__name">{{ effect.name }}</span>
          <span class="selector__desc">
            {{ editorStore.isEffectAvailable(effect.id) ? effect.description : 'Not yet available' }}
          </span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped lang="less">
.selector {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-bg-panel);
  border-right: 1px solid var(--color-border);
}

.selector__title {
  margin: 0;
  padding: var(--space-4) var(--space-4) var(--space-3);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.selector__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0 var(--space-2) var(--space-3);
  list-style: none;
}

.selector__item {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--space-3) var(--space-3);
  border: 0;
  border-left: 2px solid transparent;
  background: transparent;
  color: var(--color-text);
  text-align: left;
}

.selector__item:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.selector__item.is-active {
  border-left-color: var(--color-accent);
  background: var(--color-bg-hover);
}

.selector__item.is-disabled {
  color: var(--color-text-faint);
  cursor: not-allowed;
  opacity: 0.55;
}

.selector__name {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.selector__desc {
  color: var(--color-text-muted);
  font-size: 12px;
}

.selector__item.is-disabled .selector__desc {
  color: var(--color-text-faint);
}

@media (max-width: 960px) {
  .selector {
    border-right: 0;
    border-top: 1px solid var(--color-border);
  }

  .selector__list {
    flex-direction: row;
    overflow-x: auto;
  }

  .selector__item {
    min-width: 148px;
    border-left: 0;
    border-bottom: 2px solid transparent;
  }

  .selector__item.is-active {
    border-bottom-color: var(--color-accent);
  }
}
</style>
