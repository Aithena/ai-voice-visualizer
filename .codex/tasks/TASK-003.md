---
id: TASK-003
status: PLANNED
created: 2026-08-20
---

# TASK-003 — Visual Foundation

## Objective

建立与 Vue / Pinia 解耦的实时视觉运行时基础：`VisualEngine`（Three.js renderer / camera / render loop / resize / dispose）、Effect Registry、`VisualEffect` 统一契约、数据模型类型，以及一个最小参考效果 `PlaceholderOrb`，并把引擎挂载到现有 `VisualStage.vue`，使页面中央出现可验证的实时渲染画面。

本 Task 只实现视觉运行时基础。三个产品效果（LiquidOrb / GlassWave / EnergyCore）、Inspector、麦克风 UI 接线、Preset 均不在本 Task 范围内。

## Context

- TASK-002 已交付 `src/audio/`：`AudioAnalyzer` / `AudioData`（0..1 归一化，未启动时安全全 0），从 `src/audio/index.ts` 导出。
- TASK-001 骨架已有三栏布局；`VisualStage.vue` 目前是静态占位（CSS 圆 + 文案），本 Task 用真实 Three.js 画布替换占位视觉。
- 端口策略已由用户裁定：以现行代码为准（`strictPort: false`，允许自动顺延），与本 Task 无关但已归档。

### 本 Task 包含两处架构裁定（ADR-009 / ADR-010）

`.codex/ARCHITECTURE.md` 与 `.codex/TECHNICAL_SPEC.md` / `.codex/DATA_MODEL.md` 在两处契约上存在冲突，TASK-002 明确推迟到本 Task 裁定。裁定如下，**本 Task 规范以裁定结果为唯一权威**；因 `DECISIONS.md` 不在 WorkBuddy 写权限内，需用户将下述两条 ADR 中转录入 `.codex/DECISIONS.md`。

#### ADR-009 — VisualEffect 统一契约（合并两文档）

- ARCHITECTURE.md §8：`init(container: HTMLElement)`、`update(audioData, settings)`
- TECHNICAL_SPEC.md §4：`mount(context: VisualEffectContext)`、`update(audio, deltaTime)`

**裁定**：采用 `init(context: VisualEffectContext)` + `update(audio, deltaTime, settings)`。理由：

1. `VisualEngine` 拥有 renderer / camera（TECHNICAL_SPEC §3），Effect 不应自建 renderer——`init(container)` 隐含 Effect 自持 renderer，与引擎职责冲突，弃用。
2. `deltaTime` 是帧率无关动画的必要输入，`settings` 是实时改参（下一帧生效）的必要输入，两者都保留。
3. Effect 自持自己的 `THREE.Scene`（通过只读属性暴露），引擎渲染 `effect.scene`。这样切换 Effect 时旧 scene 可整体销毁，杜绝跨 Effect 的资源残留。

#### ADR-010 — VisualSettings 为 Effect-specific 平铺键值，Inspector 四分区是 UI 分组而非数据形状

- ARCHITECTURE.md §11：固定嵌套结构（appearance/motion/voiceResponse/light 四组固定字段）
- DATA_MODEL.md §3/§6：字段由 Effect 通过 `ControlDefinition` 定义

**裁定**：采用 DATA_MODEL.md 方向——`VisualSettings = Record<string, number | string | boolean>`，具体字段由各 Effect 的 `EffectDefinition.controls` 声明；Inspector 四分区（Appearance / Motion / Voice Response / Light）通过 `ControlDefinition.group` 表达。理由：

1. ADR-006 已裁定控件 Schema 驱动、「新增 Effect 不应重新设计 Inspector」——固定嵌套形状等于把三个 Effect 的参数写死进全局类型，破坏扩展性。
2. 不同 Effect 参数集不同（PROJECT_SPEC §5 三个效果的映射各不相同），平铺键值 + Schema 声明是唯一自洽模型。
3. ARCHITECTURE.md §11 的四组字段可作为各 Effect `controls` 的参考清单（group 取值即四分区），但不是全局类型约束。

## Scope

### In Scope

- `src/visual/` 下的视觉运行时类型与实现：
  - `VisualEffectContext`、`VisualEffect` 契约类型
  - `ControlDefinition`、`EffectDefinition`、`VisualSettings` 类型与 `defaultSettings` 构造
  - Effect Registry（注册 / 查找，按 id）
  - `VisualEngine`：renderer / camera 创建、RAF render loop、`setEffect` 切换、`updateSettings` 实时改参、resize、dispose
- `PlaceholderOrb` 最小参考效果（非产品效果）：验证引擎管线正确性
- `VisualStage.vue` 挂载集成：实例化引擎、ResizeObserver、卸载时 dispose
- 新增依赖：仅允许 `three` 与 `@types/three`
- WebGL 不可用时的明确错误路径（不崩溃、不留半初始化状态）

### Out of Scope

- LiquidOrb / GlassWave / EnergyCore 三个产品效果
- Inspector Schema UI 渲染（`InspectorPanel` 改造）
- Effect Selector 与引擎的联动（Pinia `selectedEffectId` → `engine.setEffect`）
- 麦克风 UI 接线（Header Mic 按钮仍为禁用占位）
- Voice Response Mapping 层（sensitivity / smoothing 作用于 AudioData 的公共映射工具）
- Effect 切换的平滑过渡动画（本 Task 切换允许直接重建）
- Post Processing（bloom 等）、自定义 GLSL shader（PlaceholderOrb 用内置材质即可）
- Preset 持久化、Import / Export
- Pinia store 扩展（本 Task 不动 `stores/editor.ts` 与 `types/editor.ts`）

## Required Contract

以下契约为规范级要求；实现可在语义不变的前提下微调命名，但 ADR-009/010 的形状裁定不得偏离。

### 数据模型（`src/visual/types.ts`）

```ts
import type * as THREE from 'three'
import type { AudioData } from '@/audio'

/** Inspector 四分区，即控件分组 */
export type ControlGroup = 'appearance' | 'motion' | 'voiceResponse' | 'light'

export type ControlType = 'slider' | 'color' | 'switch' | 'select'

export interface ControlDefinition {
  /** VisualSettings 中的字段名，Effect 内唯一 */
  key: string
  label: string
  type: ControlType
  defaultValue: number | string | boolean
  min?: number
  max?: number
  step?: number
  group: ControlGroup
}

/** Effect-specific 平铺键值（ADR-010） */
export type VisualSettings = Readonly<Record<string, number | string | boolean>>

export interface EffectDefinition {
  id: string
  name: string
  description?: string
  controls: ControlDefinition[]
}
```

### VisualEffect 契约（`src/visual/types.ts`，ADR-009）

```ts
/** 引擎注入的共享资源；renderer/camera 归引擎所有，Effect 不得 dispose */
export interface VisualEffectContext {
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  width: number
  height: number
}

export interface VisualEffect {
  readonly id: string
  readonly name: string
  /** init() 后必须可用；scene 及其全部子对象归 Effect 所有，dispose() 中完整释放 */
  readonly scene: THREE.Scene
  init(context: VisualEffectContext): void
  update(audio: AudioData, deltaTime: number, settings: VisualSettings): void
  resize(width: number, height: number): void
  dispose(): void
}
```

### VisualEngine（`src/visual/VisualEngine.ts`）

```ts
export type EffectFactory = () => VisualEffect
export type AudioProvider = () => AudioData

export interface VisualEngineOptions {
  /** 缺省为返回全 0 的静音 AudioData */
  audioProvider?: AudioProvider
}

export class VisualEngine {
  constructor(container: HTMLElement, options?: VisualEngineOptions)
  registerEffect(definition: EffectDefinition, factory: EffectFactory): void
  getEffectIds(): string[]
  /** 切换当前效果：销毁旧效果 → 工厂创建 → init → 重置为默认 settings */
  setEffect(effectId: string): void
  getCurrentEffectId(): string | null
  /** 当前效果的当前 settings（未设置效果时返回空对象） */
  getSettings(): Record<string, number | string | boolean>
  /** 编辑器实时改参入口：合并后下一帧生效，不重建 scene */
  updateSettings(partial: Partial<Record<string, number | string | boolean>>): void
  resetSettings(): void
  /** 启动 RAF 循环，幂等 */
  start(): void
  /** 停止 RAF 循环，可再次 start，幂等 */
  stop(): void
  isRunning(): boolean
  resize(width: number, height: number): void
  /** 停循环 → dispose 当前效果 → 释放 renderer/canvas，幂等 */
  dispose(): void
}
```

## Behavioral Requirements

1. **构造**：创建 `WebGLRenderer`（antialias、alpha、`devicePixelRatio` 钳制到 ≤2）与 `PerspectiveCamera`，canvas 挂入 container。WebGL 初始化失败必须抛出可识别错误，且不留 DOM / 状态残留。
2. **Render loop**：`start()` 幂等；每帧执行 `audioProvider()` → `effect.update(audio, deltaTime, settings)` → `renderer.render(effect.scene, camera)`。`deltaTime` 必须钳制上限（建议 ≤100ms），避免标签页切回后的时间跳变。
3. **零逐帧分配**：循环内不得新建对象（复用 AudioData 引用、settings 引用等）；`document.hidden` 时 RAF 自然暂停即可，不需要额外监听。
4. **Effect 切换**：`setEffect` 必须先完整 `dispose()` 旧效果（geometry / material / texture 全部释放），再创建并 `init` 新效果，settings 重置为该效果默认值。未注册的 id 必须抛可识别错误。新效果 `init` 抛异常时，引擎不得进入坏状态（清理半初始化效果并向上传播错误）。
5. **实时改参**：`updateSettings` 合并进当前 settings，下一帧生效；未知 key 忽略（不抛错）。禁止通过重建 scene / 效果来应用参数。
6. **Resize**：更新 renderer 尺寸、camera aspect，并转发给当前效果。`VisualStage.vue` 用 `ResizeObserver` 驱动，容器尺寸为 0 时跳过渲染即可。
7. **Dispose**：`cancelAnimationFrame` → dispose 当前效果 → `renderer.dispose()`（含 `forceContextLoss`）→ 移除 canvas → 解绑所有监听。幂等，组件卸载时必须调用。
8. **Registry**：`registerEffect` 重复 id 必须抛可识别错误；引擎对效果不得有任何硬编码分支（只认 registry）。
9. **PlaceholderOrb**：一个低多边形球体 + 基础材质 + 简单光照的参考效果；静音时保持缓慢呼吸/旋转（idle 不完全静止），`audio.volume` 驱动整体缩放以证明音频→视觉管线贯通。携带少量 `controls`（如 primaryColor、idleSpeed）用于验证 settings 通路。
10. **静音安全**：`audioProvider` 缺省或抛异常时，引擎按全 0 AudioData 继续渲染，不崩溃。
11. 所有公开类型与 `VisualEngine` 从 `src/visual/index.ts` 导出。

## Architecture Constraints

- 视觉运行时代码只允许位于 `src/visual/`。
- Vue 侧只有 `VisualStage.vue`（挂载点）允许 import `VisualEngine`；其余任何 Vue 组件不得 import `three` 或 `src/visual` 内部模块。
- `requestAnimationFrame` 只允许出现在 `VisualEngine` 内部。
- Render loop 内禁止任何 Vue / Pinia 响应式读写；`AudioData` 不得进入 Pinia。
- renderer / camera 归引擎所有，Effect 不得 dispose 它们；scene 及子对象归 Effect 所有，Effect 必须自己释放。
- 不得为三个产品效果在引擎或 Registry 中写任何特判。
- 依赖新增仅限 `three` 与 `@types/three`；不得引入 postprocessing 等额外包。
- 不得修改 `.codex/`、`.cursor/` 文档。

## Suggested File Structure

```text
src/visual/
├── VisualEngine.ts        # 引擎 + RAF loop + resize + dispose
├── registry.ts            # Effect 注册表（或并入 VisualEngine，由实现决定）
├── types.ts               # VisualEffect / EffectDefinition / ControlDefinition / VisualSettings
├── settings.ts            # defaultSettings / mergeSettings 纯函数
├── effects/
│   └── PlaceholderOrb.ts  # 参考效果（后续产品效果落地时移除或保留为开发工具）
└── index.ts               # 公开导出
```

`VisualStage.vue` 移除静态占位视觉（CSS 圆），改为挂载引擎容器；保留 stage 标签层不强制。

## Acceptance Criteria

### Project

- `npm run build`（vue-tsc + vite build）通过。
- 仅新增 `three`、`@types/three` 依赖。

### Runtime（浏览器手动验证，需记录）

- 打开应用：Visual Stage 中央出现持续动画的 PlaceholderOrb，无控制台错误。
- 窗口拉伸 / 缩放：画面正确 resize，无拉伸变形。
- 组件卸载 / 页面刷新后再挂载：无 WebGL context 泄漏警告堆积。
- WebGL 不可用环境（如强制禁用）：出现可识别错误路径，应用不白屏崩溃。

### Architecture

- `requestAnimationFrame` 仅存在于 `VisualEngine.ts`。
- `three` 仅被 `src/visual/**` 与 `VisualStage.vue` import。
- 无 Pinia AudioData store；render loop 无 Vue 响应式访问。
- Effect 切换后旧效果资源全部释放（代码审查项：无 geometry / material / texture 残留路径）。

## Testing Requirements

Cursor 至少执行：

- `vue-tsc -b` 或项目等价类型检查；
- `npm run build`；
- 对 `defaultSettings` / `settings merge` / registry 重复注册等纯逻辑做可重复验证（可沿用 TASK-002 的轻量脚本模式，无需测试框架）；
- 浏览器手动验证上述 Runtime 项并记录结果（含 resize 与卸载重挂）。

## Completion

完成后：

1. 只实现 TASK-003；
2. 报告 Changed / Added / Removed / Tested / Issues / Next；
3. 停止，不开始 TASK-004；
4. 等待 WorkBuddy Review。

如果发现架构或接口冲突（含本规范的 ADR-009/010 裁定与现实的冲突），不要静默改写 `.codex/` 文档；在报告中指出并停止相关扩展。
