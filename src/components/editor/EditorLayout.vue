<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ElDrawer } from 'element-plus'
import { useEditorStore } from '@/stores/editor'
import EditorHeader from '@/components/editor/EditorHeader.vue'
import VisualStage from '@/components/editor/VisualStage.vue'
import EffectSelector from '@/components/effects/EffectSelector.vue'
import InspectorPanel from '@/components/inspector/InspectorPanel.vue'

const editorStore = useEditorStore()
const { inspectorOpen } = storeToRefs(editorStore)
</script>

<template>
  <div class="editor">
    <EditorHeader class="editor__header" />
    <EffectSelector class="editor__effects" />
    <VisualStage class="editor__stage" />
    <InspectorPanel class="editor__inspector" />

    <ElDrawer
      v-model="inspectorOpen"
      class="editor-inspector-drawer"
      title="Inspector"
      direction="btt"
      size="72%"
      append-to-body
      :with-header="true"
    >
      <InspectorPanel />
    </ElDrawer>
  </div>
</template>

<style scoped lang="less">
.editor {
  display: grid;
  width: 100%;
  height: 100%;
  background: var(--color-bg);
  grid-template-columns: var(--effects-width) minmax(0, 1fr) var(--inspector-width);
  grid-template-rows: var(--header-height) minmax(0, 1fr);
  grid-template-areas:
    "header header header"
    "effects stage inspector";
  gap: var(--layout-gap);
}

.editor__header {
  grid-area: header;
}

.editor__effects {
  grid-area: effects;
}

.editor__stage {
  grid-area: stage;
}

.editor__inspector {
  grid-area: inspector;
}

@media (max-width: 960px) {
  .editor {
    grid-template-columns: 1fr;
    grid-template-rows: var(--header-height) minmax(240px, 1fr) minmax(160px, 32vh);
    grid-template-areas:
      "header"
      "stage"
      "effects";
  }

  .editor__inspector {
    display: none;
  }
}
</style>
