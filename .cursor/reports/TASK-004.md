# TASK-004 Report

Status: COMPLETED

## Summary

编辑器离散操作已接通视觉运行时：Selector / Inspector / Reset 经 Pinia store 由 VisualStage 单向驱动 VisualEngine。PlaceholderOrb 提供 6 个 Schema 控件作为验证载体；三个产品效果仍为禁用态。

## Changed

- `src/visual/types.ts`：ControlDefinition 增加 `options` / `ControlSelectOption`
- `src/visual/VisualEngine.ts`：`getEffectDefinition(effectId)`
- `src/visual/effects/PlaceholderOrb.ts`：6 个 controls，均在 `update()` 中脏检查生效
- `src/visual/index.ts`：导出 `ControlSelectOption`
- `src/types/editor.ts`：EffectId 加入 `placeholder-orb`；EFFECT_OPTIONS；`isEffectId` / `isMissingSelectOptions` / `isValidSelectDefault`
- `src/stores/editor.ts`：`availableEffectIds` / `currentDefinition` / `settings` / `updateSetting` / `resetEffectSettings` / `syncAvailableEffects` / `syncEffectDefinition`；`selectEffect` 可用性守卫
- `src/components/editor/VisualStage.vue`：注册后同步 store；`watch(selectedEffectId / settings)` 单向驱动引擎
- `src/components/effects/EffectSelector.vue`：未注册效果禁用并显示 "Not yet available"
- `src/components/inspector/InspectorPanel.vue`：按 Schema 分组渲染 ElSlider / ElColorPicker / ElSwitch / ElSelect；空分区隐藏；脏 select 禁用并 warn 一次
- `src/components/editor/EditorHeader.vue`：Reset 启用 → `resetEffectSettings`
- `src/main.ts` / `src/styles/element-plus.less`：按需引入 slider / color-picker / switch / select 样式

## Added

- `scripts/verify-editor-wiring.ts`

## Removed

- Inspector 静态 "Awaiting schema" 占位

## Tested

- `npm run build`：vue-tsc + Vite production build 通过
- `npx tsx scripts/verify-editor-wiring.ts`：Editor wiring self-check passed
  - defaultSettings 含 6 个新控件
  - ambientLevel defaultValue ∈ options
  - 无 options 的 select → dirty schema
  - selectEffect 拒绝 liquid-orb；updateSetting 忽略未知 key；reset 恢复默认
- grep：`requestAnimationFrame` 仅 `VisualEngine.ts`
- grep：`from 'three'` 仅 `src/visual/**`
- grep：`src/stores` 无 AudioData
- grep：`VisualEngine` 仅 `VisualStage.vue` import
- Inspector 无效果 id 特判
- Slider 使用 `@change`，不在拖动 input 时写 store
- Dev Server: http://localhost:18806（preferred 18801 occupied）
- 实现时无有界面浏览器做 Behavioral Requirements 1–9 肉眼验收（后续由 WorkBuddy 独立验证）

## Issues

- ControlDefinition.options 扩展按 TASK 说明可不阻塞；未写入新 ADR
- 音频仍未接入，volumeSensitivity 通路已写，静音下无可视变化（规范允许）
- three chunk splitting（TASK-003 INFO-1）未做（Out of Scope）

## Next

等待 WorkBuddy Review。对 WorkBuddy 说：`Review TASK-004`
