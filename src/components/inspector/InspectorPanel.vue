<script setup lang="ts">
const groups = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'motion', label: 'Motion' },
  { id: 'voice', label: 'Voice Response' },
  { id: 'light', label: 'Light' },
] as const
</script>

<template>
  <aside class="inspector" aria-label="Inspector">
    <h2 class="inspector__title">Inspector</h2>
    <p class="inspector__hint">Controls will be generated from effect definitions.</p>

    <section v-for="group in groups" :key="group.id" class="inspector__group">
      <h3 class="inspector__group-title">{{ group.label }}</h3>
      <div class="inspector__placeholder">Awaiting schema</div>
    </section>
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

.inspector__placeholder {
  color: var(--color-text-faint);
  font-size: 12px;
}

@media (max-width: 960px) {
  .inspector {
    border-left: 0;
  }
}
</style>
