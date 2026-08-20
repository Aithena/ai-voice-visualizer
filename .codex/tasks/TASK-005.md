---
id: TASK-005
status: PLANNED
created: 2026-08-20
---

# TASK-005 — LiquidOrb: First Product Effect

## Objective

实现第一个产品级视觉效果 **LiquidOrb**（PROJECT_SPEC §5.1）：柔软、液态、有生命感的 AI 能量球——紫/蓝/粉渐变、半透明、Glow、轻微形变、呼吸感、有机运动。它通过 ADR-009 契约接入现有运行时，验证「一个产品效果 = 一个 EffectDefinition + 一个实现 + 一行注册」的扩展模型，同时补上 TASK-004 review 的 **LOW-1**（`applyCurrentEffect` 缺 init 失败兜底）。

完成后：Selector 中 LiquidOrb 从 "Not yet available" 变为可选中并成为**默认效果**；Inspector 由其 Schema 自动生成控件，UI 零改动（TASK-004 交付的属性）。

## Context

- TASK-003 交付运行时：`VisualEngine`（RAF/resize/dispose/setEffect/updateSettings）、Registry、ADR-009 契约（`init(context)` / `update(audio, deltaTime, settings)`，Effect 自持 scene，引擎持 renderer/camera）。
- TASK-004 交付编辑器接线：store ↔ engine 单向桥、Schema 驱动 Inspector（四种控件类型）、Selector 可用性禁用态。新效果注册后这些 UI **自动**生效。
- 音频尚未接入（`audioProvider` 缺省 → 全 0 AudioData）。本 Task 的 Voice Response 通路**必须完整实现**，但页面上的可见验证只能是 idle 状态；音频驱动验证由自检脚本用合成 AudioData 完成，真实麦克风验证留给 Mic Task。
- ARCHITECTURE §14 GPU/Shader 策略：AudioData 优先经 Shader Uniform 进 GPU（`uVolume` / `uBass` / `uTreble` / `uPitch` / `uSpeechActivity` / `uTime`）。本 Task 是项目**首个自定义 GLSL 效果**，为 GlassWave / EnergyCore 立实现范式。

## Scope

### In Scope

- `src/visual/effects/LiquidOrb.ts`：`liquidOrbDefinition` + `createLiquidOrb`，自定义 `ShaderMaterial`（GLSL 内联于同文件，或拆 `src/visual/shaders/liquid.ts`——Cursor 自选，无新增依赖）
- `src/visual/index.ts`：导出 LiquidOrb 定义与工厂
- `src/components/editor/VisualStage.vue`：
  - 注册 LiquidOrb（**在 PlaceholderOrb 之前**注册，使 `availableIds[0] === 'liquid-orb'`，成为默认效果；PlaceholderOrb 保留可切换作为 Reference）
  - **LOW-1 修复**：`applyCurrentEffect` 加 try/catch——`setEffect` 抛错时回退到上一个成功效果（store 同步回退），并向 `errorMessage` 或 console 输出一次错误，不允许卡死在「selectedEffectId 指向坏效果且 currentDefinition 为 null」的状态
- `scripts/verify-liquid-orb.ts`：自检脚本（见 Testing Requirements）
- 可选（不强制）：顺手消除 TASK-004 INFO-1（setEffect 后紧随的冗余 `updateSettings`，用「刚切换」守卫标志抑制）

### Out of Scope

- GlassWave / EnergyCore（各自后续 Task）
- 麦克风 UI / audioProvider 接线（Mic 按钮保持禁用）
- Post Processing / UnrealBloom（Glow 用 Shader 内实现：fresnel rim + 自发光渐变，不引入后处理管线——首个效果不做，后续如需 bloom 走独立 Task + ADR）
- Effect 切换的平滑过渡动画（PROJECT_SPEC §7 要求属于 MVP 完成态，但它是引擎级机制、影响全部效果，本 Task 直接重建即可；已记入 STATUS 待办，建议独立 Task）
- `three` chunk 分割（TASK-003 INFO-1，继续顺延）
- Preset 持久化

## Required Contract

### 1. EffectDefinition（`liquidOrbDefinition`）

```ts
id: 'liquid-orb'
name: 'LiquidOrb'
description: 'Soft liquid AI energy orb'
```

Controls（下表为**最小集合**，实现可微调 label/范围，但 key、group、type、默认值方向不得偏离）：

| key | type | group | 默认 | 作用 |
|---|---|---|---|---|
| `primaryColor` | color | appearance | `'#8b5cf6'`（紫） | 渐变主色 |
| `secondaryColor` | color | appearance | `'#ec4899'`（粉） | 渐变辅色 |
| `opacity` | slider (0.1–1, 0.05) | appearance | `0.9` | 整体不透明度（半透明是核心视觉） |
| `idleSpeed` | slider (0.1–3, 0.1) | motion | `1` | 呼吸/流动速度 |
| `distortion` | slider (0–1, 0.05) | motion | `0.25` | 基础形变幅度（静音基线） |
| `volumeSensitivity` | slider (0–2, 0.05) | voiceResponse | `1` | volume→缩放增益 |
| `bassSensitivity` | slider (0–2, 0.05) | voiceResponse | `1` | bass→形变增益 |
| `trebleSensitivity` | slider (0–2, 0.05) | voiceResponse | `1` | treble→glow 增益 |
| `glowIntensity` | slider (0–3, 0.05) | light | `1` | 基础 glow（fresnel/自发光强度） |

要求：每个控件在 `update()` 中真实生效（uniform 或属性脏检查后写入），遵循 PlaceholderOrb 的脏检查缓存模式。

### 2. 视觉实现要求（PROJECT_SPEC §5.1 映射）

| 规范特征 | 实现指引 |
|---|---|
| 柔和渐变（紫/蓝/粉） | Fragment shader：`primaryColor` ↔ `secondaryColor` 按渐变因子混合；**pitch 驱动渐变位置**（`uPitch` 平移 mix 因子），静音时按 `uTime` 缓慢漂移 |
| 轻微形变 / 有机运动 | Vertex shader：3D noise（simplex/classic 均可，Ashima 公有域实现直接内联，**不算新增依赖**）沿法线位移；`distortion` 为静音基线，**bass 驱动形变增益** |
| 呼吸感 | Volume/静音下的整体 scale 正弦呼吸（CPU 侧或 shader 均可，与 PlaceholderOrb 同语义）；Idle 永不完全静止 |
| Glow | Fresnel rim（视角边缘光）+ 自发光；**treble 驱动 glow 增益**，`glowIntensity` 为基线 |
| 半透明 | `transparent: true` + `opacity` 控制整体 alpha；`depthWrite` 按需（避免半透明排序问题可关闭） |
| Volume → Scale | `volume × volumeSensitivity` 驱动整体缩放 |

Uniform 集（最少）：`uTime`、`uVolume`、`uBass`、`uTreble`、`uPitch`、`uSpeechActivity`、`uPrimaryColor`、`uSecondaryColor`、`uOpacity`、`uDistortion`、`uGlowIntensity`。**speechActivity 驱动整体动画强度**（形变速度/漂移速度乘数）。

### 3. 性能与资源纪律

- 几何体静态（如 `IcosahedronGeometry(1, 4)` 级别细分），**形变全部在 vertex shader**，禁止逐帧 CPU 改顶点、禁止逐帧重建 geometry/material/mesh
- `update()` 内零分配（uniform 复用既有 THREE 对象，颜色写入用 `.set()`）
- 所有进 uniform 的数值 clamp（0–1 音频量、slider 范围），NaN/undefined 走 fallback——与 TASK-002 的防御等级一致
- `dispose()`：沿用 `disposeObject3D` + `scene.clear()` 模式；ShaderMaterial 的 GLSL 程序由 material.dispose() 释放，无需额外处理
- 帧循环内不读写 Vue/Pinia（红线不变）

### 4. LOW-1 修复（`VisualStage.vue`）

`applyCurrentEffect` 包 try/catch：`engine.setEffect` 抛 `VisualEngineError` 时——

1. 若存在上一个成功效果：将 `selectedEffectId` 回退为它并重新同步 store（注意避免 watch 递归：回退写 store 会再次触发 watch，需保证幂等或加守卫）
2. `console.error` 一次（含 effect id 与错误码）；`errorMessage` 显示简短提示也可，二选一
3. 不允许出现：selectedEffectId 指向失败效果、currentDefinition 为 null、Inspector 空白的死锁状态

### 5. 注册与默认选择

`VisualStage.vue` onMounted 内注册顺序：`liquidOrbDefinition` → `placeholderOrbDefinition`。现有 `syncAvailableEffects(availableIds, availableIds[0])` 逻辑无需改动即得到默认 `liquid-orb`。`types/editor.ts` 的 `EFFECT_OPTIONS` 无需变更（liquid-orb 条目已存在，可用性由 store 派生）。

## Behavioral Requirements

1. 页面加载：默认选中 **LiquidOrb**，Stage 渲染半透明紫粉渐变球体，有呼吸/流动（不完全静止），Inspector 按其 Schema 显示 9 个控件、四分区齐全
2. Selector：LiquidOrb 高亮可用；PlaceholderOrb 可切换（标注 Reference）；GlassWave / EnergyCore 仍禁用 "Not yet available"
3. 改 `primaryColor` / `secondaryColor`：下一帧渐变色变化
4. 改 `opacity` / `glowIntensity` / `distortion` / `idleSpeed`：实时可见变化
5. Reset：全部控件回默认值
6. LiquidOrb ↔ PlaceholderOrb 来回切换：正常重建，无控制台错误（过渡不平滑是已知 Out of Scope，不算缺陷）
7. 静音（无麦克风）下：所有 voiceResponse 控件调节无可见崩溃/异常，仅通路就绪
8. 无控制台错误；窗口拉伸不变形（引擎 resize 链路已有，回归确认即可）

## Architecture Constraints

- 新增依赖：**禁止**（three 的 ShaderMaterial/GLSL 内联即够）
- `requestAnimationFrame` 仅 `VisualEngine.ts`；`three` 仅 `src/visual/**`；Vue 组件仍不 import `three`（`VisualStage.vue` 维持既有 `@/visual` 授权）
- `AudioData` 不进 Pinia；store 仅离散编辑状态
- Inspector / Selector / Header / store：**零改动预期**（LOW-1 修复只动 `VisualStage.vue`；若实现中发现必须动 store，在报告中说明理由）
- 不修改 `.codex/`、`.cursor/`

## Testing Requirements

- `npm run build`
- `scripts/verify-liquid-orb.ts` 自检至少覆盖：
  - Schema 校验：controls 含全部 9 个 key；slider 默认值 ∈ [min, max]；select（本效果无）——纯函数级
  - **合成音频驱动**：构造 stub context（renderer/camera 可为空对象强转）调 `init()`，分别注入全 0 / 非零（volume=1, bass=0.8, treble=0.6, pitch=0.7, speechActivity=1）AudioData 调 `update()`，断言：不抛错、uniform 值按映射变化（如 uVolume=1、形变增益>静音基线）、无 NaN
  - 逐帧零分配抽查：连续 update() 若干次，无异常
  - `dispose()` 后 scene.children 为空，重复 dispose 不抛错
- 架构 grep 自查（RAF/three 作用域、store 无 AudioData）
- 浏览器手动验证 Behavioral Requirements 1–8 并记录（无 GUI 环境则注明，由 Review 侧 headless 验证补位）

## Acceptance Criteria

- `npm run build` 通过；零新增依赖
- Behavioral Requirements 1–8 通过；无控制台错误
- grep 红线全部干净（RAF / three / AudioData / VisualEngine import 作用域）
- LiquidOrb 完整走 ADR-009 契约 + ADR-010 平铺 settings，无契约变体
- LOW-1 具备可验证行为：人为让某 effect init 抛错（临时测试代码，不入库）时选择回退不死锁——自检脚本或报告描述验证方式

## Completion

完成后：

1. 只实现 TASK-005；
2. 报告 Changed / Added / Removed / Tested / Issues / Next；
3. 停止，不开始 TASK-006；
4. 等待 WorkBuddy Review。

如发现本规范与 ADR-009/010 或既有代码冲突，不要静默改架构；在报告中指出并停止相关部分。

## Reviewer Notes (WorkBuddy)

- Review 重点：①uniform 数值链路（合成 AudioData → uniform 断言）；②逐帧零分配（读 update() 实现）；③GLSL 是否内联且无新增依赖；④LOW-1 回退逻辑的 watch 递归安全性；⑤视觉验证用 headless Edge 截图（紫粉渐变球体 + Inspector 9 控件）。
- GLSL 内联 Ashima noise 属公有域代码直接嵌入，许可上无问题，但报告中应注明来源。
- 本 Task 不触碰任何 ADR；smooth effect transition 与 post-processing 两个遗留方向已在 STATUS 记为候选后续 Task。
