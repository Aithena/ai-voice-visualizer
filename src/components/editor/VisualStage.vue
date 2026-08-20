<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
const { selectedEffect } = storeToRefs(editorStore)
</script>

<template>
  <section class="stage" aria-label="Visual Stage">
    <div class="stage__frame">
      <div class="stage__core" aria-hidden="true" />
      <p class="stage__label">Visual Stage</p>
      <p class="stage__effect">{{ selectedEffect.name }}</p>
      <p class="stage__hint">Realtime visual runtime will mount here</p>
    </div>
  </section>
</template>

<style scoped lang="less">
.stage {
  display: flex;
  min-width: 0;
  min-height: 0;
  background: var(--color-bg-stage);
}

.stage__frame {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.stage__core {
  width: min(42vh, 280px);
  height: min(42vh, 280px);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  opacity: 0.55;
  background:
    radial-gradient(circle at 50% 48%, rgba(196, 199, 212, 0.08) 0%, rgba(196, 199, 212, 0.02) 36%, transparent 62%);
}

.stage__label,
.stage__effect,
.stage__hint {
  margin: 0;
  text-align: center;
}

.stage__label {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  color: var(--color-text-faint);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.stage__effect {
  margin-top: var(--space-5);
  color: var(--color-text);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.stage__hint {
  margin-top: var(--space-2);
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
