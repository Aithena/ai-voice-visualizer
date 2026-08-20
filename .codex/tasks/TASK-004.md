---
id: TASK-004
status: PLANNED
created: 2026-08-20
---

# TASK-004 — Editor Wiring: Effect Selector & Schema-Driven Inspector

## Objective

把编辑器 UI 与视觉运行时接通：Effect Selector 的选择真实驱动 `engine.setEffect`，Inspector 从当前效果的 `EffectDefinition.controls`（ADR-010 Schema）自动生成控件并实时改参（`engine.updateSettings`）。完成后，选择效果、调参数、重置参数成为端到端可验证的闭环，为后续产品效果 Task（TASK-005+）铺平道路——届时每个产品效果只需提供 `EffectDefinition` + 实现，UI 零改动。

本 Task 同时扩展 `PlaceholderOrb` 的 controls 至覆盖 Inspector 四分区与四种控件类型，作为 Inspector 渲染的验证载体。

## Context

- TASK-003 已交付：`VisualEngine`（RAF/resize/dispose/setEffect/updateSettings）、`EffectRegistry`、`VisualEffect` 契约（ADR-009）、`PlaceholderOrb`（2 个 controls）。引擎在 `VisualStage.vue` 内私有实例化并挂载。
- 现状断点：
  - `stores/editor.ts` 只有 `selectedEffectId`（默认 `'liquid-orb'`）与 `inspectorOpen`，选择是纯 UI 状态，不驱动引擎。
  - `EffectSelector.vue` 列表来自 `EFFECT_OPTIONS`（三个产品效果，均未实现、未注册）。
  - `InspectorPanel.vue` 是静态占位（四分区 "Awaiting schema"）。
  - `EditorHeader.vue` 的 Reset 按钮为禁用占位。
- 架构纪律不变：Vue/Pinia 不参与逐帧渲染；本 Task 接通的是**离散编辑动作**（选效果、改参数、重置），全部走「store 状态 → VisualStage 内 watcher → engine 调用」的单向通道。

## Scope

### In Scope

- `src/visual/` 侧：
  - `ControlDefinition` 扩展：`options?: ReadonlyArray<{ label: string; value: string }>`（`type: 'select'` 时必填）
  - `VisualEngine` 新增只读查询：`getEffectDefinition(effectId: string): EffectDefinition`（供 UI 获取 Schema；未注册 id 抛 `EFFECT_NOT_REGISTERED`）
  - `PlaceholderOrb` controls 扩展至 6–8 个，覆盖四分区 × 四控件类型，且 `update()` / `init()` 真实响应每个控件
- `src/` 编辑器侧：
  - `types/editor.ts`：`EffectId` 联合类型加入 `'placeholder-orb'`；`EFFECT_OPTIONS` 增加对应条目（标注 Reference）
  - `stores/editor.ts` 扩展：`availableEffectIds`（已注册可用的效果 id 集合）、`currentDefinition`（当前效果 Schema）、`settings`（当前效果的设置快照）、`updateSetting(key, value)`、`resetEffectSettings()`；`selectEffect` 增加可用性守卫
  - `VisualStage.vue`：注册效果后把可用列表 + 当前 Schema 同步进 store；`watch(selectedEffectId)` → `engine.setEffect`；`watch(settings, deep)` → `engine.updateSettings`；引擎仍为组件私有实例
  - `EffectSelector.vue`：列表数据改从 store 读取；不可用（未注册）的效果条目禁用并显示 "Not yet available"；默认选中第一个**可用**效果
  - `InspectorPanel.vue`：按 `currentDefinition.controls` 分组渲染（`group` → 四分区；空分区隐藏），Element Plus 控件映射见下
  - `EditorHeader.vue`：Reset 按钮启用 → `resetEffectSettings()`
- 轻量自检脚本扩展（沿用 TASK-002/003 模式）

### Out of Scope

- LiquidOrb / GlassWave / EnergyCore 三个产品效果的实现（各自后续 Task；本 Task 只需 Selector 中禁用态展示）
- 麦克风 UI 接线（Mic 按钮保持禁用；`audioProvider` 仍缺省静音）
- Preset 持久化 / localStorage / Import / Export（settings 只存内存 store）
- Effect 切换的平滑过渡动画（直接重建即可，TASK-003 已定义切换行为）
- `three` 代码分割 / chunk 优化（TASK-003 review INFO-1，独立跟进）
- 自定义 Shader / Post Processing

## Required Contract

### 1. ControlDefinition 扩展（`src/visual/types.ts`）

```ts
export interface ControlSelectOption {
  label: string
  value: string
}

export interface ControlDefinition {
  key: string
  label: string
  type: ControlType
  defaultValue: number | string | boolean
  min?: number
  max?: number
  step?: number
  /** type === 'select' 时必填；其他 type 忽略 */
  options?: ReadonlyArray<ControlSelectOption>
  group: ControlGroup
}
```

### 2. VisualEngine 新增 API

```ts
getEffectDefinition(effectId: string): EffectDefinition
// registry 的只读透出；未注册 id 抛 VisualEngineError('EFFECT_NOT_REGISTERED')
```

不得借此泄漏 registry 内部可变结构（返回定义对象的只读引用即可，UI 侧不得修改）。

### 3. PlaceholderOrb controls（验证载体）

最少覆盖（实现可增不可减语义）：

| key | type | group | 默认 | 作用 |
|---|---|---|---|---|
| `primaryColor` | color | appearance | `'#c4c7d4'` | 材质基色（已有） |
| `wireframe` | switch | appearance | `false` | 线框模式 |
| `idleSpeed` | slider (0.1–3, 0.1) | motion | `1` | 呼吸/旋转速度（已有） |
| `volumeSensitivity` | slider (0–2, 0.05) | voiceResponse | `1` | volume→缩放增益（静音下无可见变化，通路正确即可） |
| `keyLightIntensity` | slider (0–3, 0.05) | light | `0.9` | 方向光强度 |
| `ambientLevel` | select | light | `'normal'` | 环境光三档：`dim` / `normal` / `bright` |

要求：每个控件在 `update()`（或 init 后首次 update）中真实生效；静音安全不变；逐帧零分配原则不变（select 切换与 color 应用需做脏检查缓存，参照现有 `appliedColor` 模式）。

### 4. Editor store 形状（`src/stores/editor.ts`）

```ts
state:
  selectedEffectId: EffectId            // 初始值 = 第一个可用效果 id
  availableEffectIds: EffectId[]        // 引擎已注册且在 EFFECT_OPTIONS 中的 id
  currentDefinition: EffectDefinition | null
  settings: Record<string, number | string | boolean>  // 当前效果设置快照
  inspectorOpen: boolean                // 不变

actions:
  selectEffect(id): void                // 守卫：id 必须 ∈ availableEffectIds，否则忽略
  updateSetting(key, value): void       // 修改 settings[key]；key 不在 currentDefinition.controls 中则忽略
  resetEffectSettings(): void           // settings 重置为 defaultSettings(currentDefinition.controls)
  // VisualStage 调用的同步入口（非公开 UI action）：
  syncAvailableEffects(ids, defaultSelectedId): void
  syncEffectDefinition(definition, defaultSettings): void  // setEffect 成功后由 VisualStage 调用
```

- `settings` 是**编辑器状态镜像**，引擎运行时仍以自身合并结果为准；本 Task 不做反向回读（引擎 clamp 后的值不回写 store），接受镜像与引擎一致（PlaceholderOrb 不改写值，成立）。
- **红线不变**：store 中永远不出现 `AudioData` / 逐帧数据；`settings` 只在用户离散操作时变化。

### 5. 桥接模式（唯一合法通道）

```
EffectSelector / InspectorPanel / EditorHeader
        │  (只读写 store，不 import 引擎)
        ▼
   Pinia store（离散编辑状态）
        │  watch(selectedEffectId) / watch(settings, { deep: true })
        ▼
   VisualStage.vue（唯一持有 engine 实例的组件）
        │  engine.setEffect(id) / engine.updateSettings(changed)
        ▼
   VisualEngine → RAF loop（不变，逐帧链路无 Vue 参与）
```

- 引擎 → store 的同步（可用列表、Schema）只发生在**离散事件**（挂载注册后、setEffect 成功后），不在帧循环内。
- `VisualStage.vue` 仍是唯一允许 import `VisualEngine` 的 Vue 组件；其余组件只依赖 store 与 `@/types/editor`。`EffectDefinition` / `ControlDefinition` 等纯类型与数据经 store 传递，Vue 组件不直接 import `@/visual`（保持 TASK-003 边界不变，无需放宽）。

### 6. Inspector 渲染规则（`InspectorPanel.vue`）

- 分区顺序固定：Appearance → Motion → Voice Response → Light；`controls` 中不存在的分区整节隐藏（不留空壳）。
- 控件映射（ADR-007：Element Plus 只做控件）：
  - `slider` → `ElSlider`（min/max/step 来自 ControlDefinition）
  - `color` → `ElColorPicker`
  - `switch` → `ElSwitch`
  - `select` → `ElSelect` + `ElOption`（options 来自 ControlDefinition）
- 每控件显示 `label`；修改即时调 `updateSetting`（slider 建议节流到 change/step 粒度，避免拖动期间高频 store 写入——实现可选用 `@change` 而非 `@input`）。
- 无当前效果（`currentDefinition === null`）时显示提示文案；`type: 'select'` 但 `options` 缺失时该控件渲染为禁用并在 console.warn 一次（防御脏 Schema）。

### 7. EffectSelector 渲染规则

- 列表来源：`EFFECT_OPTIONS`（保持产品规划展示）∪ 可用性（`availableEffectIds`）。
- 未注册的效果条目：禁用（不可点击）+ 视觉弱化 + 描述区显示 "Not yet available"。
- `placeholder-orb` 条目名称区显示 "PlaceholderOrb"，描述区注明 "Reference"。

## Behavioral Requirements

1. 页面加载：默认选中 `placeholder-orb`（第一个可用效果），Stage 渲染该效果，Inspector 显示其 6 个控件（3 个分区非空，Voice Response 分区此时有 volumeSensitivity 也非空；Light 非空）。
2. 点击禁用条目（如 LiquidOrb）：无任何状态变化、无报错。
3. 修改 `primaryColor`：下一帧球体颜色改变，无需切换效果或刷新。
4. 修改 `keyLightIntensity` / `ambientLevel` / `wireframe`：光照与线框实时可见变化。
5. 拖动 `idleSpeed`：呼吸/旋转速度变化。
6. Reset：全部控件回到默认值，球体视觉回到默认状态。
7. 效果切换（当前仅 placeholder-orb 可切，逻辑需对未来多效果成立）：切换即重置 settings 为新效果默认值，Inspector 重建。
8. 移动端（≤960px）：Drawer 中的 InspectorPanel 与桌面侧栏行为一致（同源于 store）。
9. 所有上述交互不产生控制台错误；RAF 循环内零 Vue 响应式读写（验收 grep 项）。

## Architecture Constraints

- 新增依赖：**禁止**（Element Plus / three 均已就位）。
- `requestAnimationFrame` 仍仅允许出现在 `src/visual/VisualEngine.ts`。
- `three` 仍仅允许 `src/visual/**` import；Vue 组件不直接 import `three` 或 `@/visual`（`VisualStage.vue` 的 `@/visual` import 维持 TASK-003 授权范围）。
- `AudioData` / 逐帧数据不得进入 Pinia；store 只承载离散编辑状态。
- Effect 切换与参数应用不得重建引擎或 scene 来达成（`updateSettings` 语义，TASK-003 已定）。
- 不修改 `.codex/`、`.cursor/` 文档。
- `stores/editor.ts`、`types/editor.ts` 本 Task **解禁**（TASK-003 曾冻结，本 Task 明确允许修改）。

## Testing Requirements

Cursor 至少执行：

- `npm run build`（vue-tsc + vite）
- 自检脚本扩展（`scripts/verify-editor-wiring.ts` 或并入现有模式）至少覆盖：
  - `defaultSettings` 生成含全部新控件；select 控件 defaultValue ∈ options.values
  - `updateSetting` 未知 key 忽略；`selectEffect` 守卫拒绝不可用 id
  - `ControlDefinition` 无 options 的 select 被识别为脏 Schema（纯函数级校验）
- 架构 grep 自查：RAF 作用域、three 作用域、store 无 AudioData
- 浏览器手动验证 Behavioral Requirements 1–9 并记录（重点：改色/改光/线框即时生效、Reset、禁用条目行为、移动端 Drawer）

## Acceptance Criteria

### Project

- `npm run build` 通过；零新增依赖。

### Runtime（浏览器手动验证，需记录）

- 加载即见 PlaceholderOrb + Inspector 6 控件，默认值正确。
- 全部 Behavioral Requirements 1–9 逐项通过，无控制台错误。
- 拖动 slider 过程中动画不卡顿（settings 写入不进帧循环）。

### Architecture

- grep：`requestAnimationFrame` 仅 `VisualEngine.ts`；`three` 仅 `src/visual/**`；`src/stores/` 无 `AudioData`。
- `VisualStage.vue` 之外无任何组件 import `VisualEngine`。
- Inspector 对 PlaceholderOrb 的渲染完全由 `EffectDefinition.controls` 驱动，组件内无效果特定分支（为产品效果零 UI 改动做铺垫——验收时用「假想新 definition 即可渲染」推演检查）。

## Completion

完成后：

1. 只实现 TASK-004；
2. 报告 Changed / Added / Removed / Tested / Issues / Next；
3. 停止，不开始 TASK-005；
4. 等待 WorkBuddy Review。

如发现本规范与 ADR-009/010 或既有代码冲突，不要静默改架构；在报告中指出并停止相关部分。

## Reviewer Notes (WorkBuddy)

- 本规范包含一处对 TASK-003 约束的**定向解禁**：`stores/editor.ts` 与 `types/editor.ts` 从「本 Task 不动」变为「本 Task 允许修改」。这是任务边界演进，非架构变更，不触发 ADR-008。
- `ControlDefinition.options` 扩展是 DATA_MODEL.md §5 形状演进，方向与 ADR-006（Schema 驱动）一致；如后续需要，可在 DECISIONS.md 补一条 ADR（待用户裁定，不阻塞本 Task）。
- Review 时将重点核查：watch 链路是否真的单向（store → engine）、Inspector 是否无效果特定分支、select 脏 Schema 防御、slider 高频写入是否被节流。
