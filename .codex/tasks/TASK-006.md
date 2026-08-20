# TASK-006 — GlassOrb + Stage 背景切换

> **类型**：产品效果（独立 Effect）+ Editor 能力升级
> **优先级**：高（用户原诉求落地）
> **动机**：用户最初的需求是"做这种动态球效果的编辑页面，通过调整各个参数，实现这种效果"。TASK-005 LiquidOrb 完成了"能转、有动画、有 9 控件"的最简示范，但在视觉风格上离用户给的参考图（图 1 白底粉紫玻璃球、图 2 黑底极光带球、图 3 黑底星爆球）仍有显著差距。本 Task 把其中最具代表性的 **图 1 白底玻璃球美学**作为一个独立的 Effect 落地（按用户裁决"完全独立 Effect"），并补充 Stage 背景切换能力（白底/黑底 二选一），让 GlassOrb 真正能在白底舞台下还原参考图。

---

## 1. 背景与目标

### 1.1 用户原始诉求
> "做这种动态球效果的编辑页面，通过调整各个参数，实现这种效果。"（参考图：玻璃球 / 极光带球 / 星爆球 三种截然不同的视觉风格）

### 1.2 现状
- 只有 `LiquidOrb` 一个 Effect，固定紫粉色调、深色舞台。
- Stage 背景走 CSS 变量 `var(--color-bg-stage)`，单一深色调。
- 用户在 Inspector 里只能"在紫色流体基础上微调"，无法触达白底玻璃球这种完全不同的美学。

### 1.3 本 Task 目标
1. **GlassOrb**：作为**完全独立**的 Effect（用户裁决 2026-08-20）落地，默认状态即白底舞台下的粉紫玻璃球，对应参考图 1 的美学。Inspector 暴露 9 控件（4 分区），允许用户在该效果内进一步调整（更柔/更亮/更强 rim...）。
2. **Stage 背景切换**：Stage 支持 dark / light 两种舞台底色。GlassOrb 默认绑定 light；LiquidOrb 默认绑定 dark。后续新增 Effect 可各自声明 `preferredStageStyle`。

### 1.4 不在本 Task 范围（Out of Scope）
- ❌ 极光带球（图 2）、星爆球（图 3）——下一个 Task 候选。
- ❌ Effect 切换的平滑过渡（PROJECT_SPEC §7）——独立 Task。
- ❌ Post-processing / bloom / refraction 真实实现——shader 内可用 fresnel rim + 透明 + 颜色叠加近似，**不**做真实折射或后期。
- ❌ Preset 存读——独立 Task。
- ❌ 麦克风权限接线——独立 Task。
- ❌ 任何对 LiquidOrb 视觉风格的改动——保持 LiquidOrb 现状。

---

## 2. 架构约束（与 ADR-009 / ADR-010 对齐）

- **Effect 合同**：`init(context: VisualEffectContext)` + `update(audio, deltaTime, settings)`；Effect 自持 `scene`，引擎持 `renderer/camera/RAF`。GlassOrb 必须遵循。
- **VisualSettings** = Effect-specific 平铺键值。GlassOrb 自身的 9 控件键不能与 LiquidOrb 重复（避免 `editorStore` 序列化混淆）。
- **AudioData 是 ephemeral 的**：不进 Pinia/Preset，只在 update() 帧内读。GlassOrb 沿用 LiquidOrb 的 5-way uniform：`uVolume/uBass/uTreble/uPitch/uSpeechActivity`。
- **Vue / Pinia 不进入 RAF**。新加的"Stage 背景切换"必须是 Pinia 状态驱动 CSS 变量，**不允许** Effect 内手动改 stage DOM。
- **Three.js 引入范围**：仅在 `src/visual/**`。Stage 组件 import 从 `@/visual`，不直接 `from 'three'`。

---

## 3. Stage 背景切换（Editor 能力）

### 3.1 行为
- Stage `<section class="stage">` 接受一个 `data-stage-bg` attribute：`"dark"`（默认，与现状一致）或 `"light"`。
- CSS（`src/components/editor/VisualStage.vue` scoped 样式 + `src/styles/tokens.less` if needed）根据 attribute 应用对应的 `background-color`：
  - `data-stage-bg="dark"` → `var(--color-bg-stage-dark)`（与现有 `var(--color-bg-stage)` 等价，向后兼容）
  - `data-stage-bg="light"` → `var(--color-bg-stage-light)`（新 token，近白/极浅灰，保证 Inspector 文字仍可读）
- 新增 Pinia store（或 editorStore 里新字段）`stageStyle: 'dark' | 'light'`，对外暴露 setter `setStageStyle(s)`。
- `data-stage-bg` attribute 由 `VisualStage.vue` 的模板根据 `stageStyle` 绑定（`<section class="stage" :data-stage-bg="stageStyle">`）。

### 3.2 Header 增加切换 UI
- 在 `<AppHeader>` 内（或合适位置）放一个 toggle：`🌙 Dark / ☀️ Light`。
- 切换调用 `editorStore.setStageStyle('light' | 'dark')`。
- 不持久化（不写 localStorage）——本 Task 范围仅覆盖当前会话。如果 Reviewer 觉得"切完刷新就丢失"成为阻断 issue，再后续 Task 处理。

### 3.3 Effect 默认绑定
- `EffectDefinition` 扩展一个可选字段 `preferredStageStyle?: 'dark' | 'light'`（不进 ADR，作为 types.ts 的可选扩展，Cursor 直接加上即可——若需 ADR 走临时授权通道）。
- `VisualEngine.setEffect(id)` 内部根据新 Effect 的 `preferredStageStyle` 调用 `editorStore.setStageStyle(...)` 以切换舞台（前提：用户尚未手动覆盖——即 store 暴露 `userOverrideStageStyle: boolean`，手动切过后不再自动切）。
- GlassOrb：`preferredStageStyle: 'light'`。
- LiquidOrb：`preferredStageStyle: 'dark'`（向后兼容，现状即 dark）。
- PlaceholderOrb：`preferredStageStyle: 'dark'`（向后兼容）。

### 3.4 不与现有组件冲突
- 不要改 `.stage__label` / `.stage__effect` / `.stage__error` 的颜色变量；它们已经走 `--color-text-faint/muted`，两种 stage style 下都应可读。若切换到 light 后变得不可读，Cursor 应在 less 中按 attribute 覆写 text color。

---

## 4. GlassOrb 效果规格

### 4.1 视觉目标
对应参考图 1：
- 白底或极浅舞台，**强 fresnel rim glow**（粉紫到玫瑰金边），**球体内部高光柔软弥散**，**形变极轻微**（接近完美球面，安静时几乎静止）。
- 说话时（speechActivity 上升）球体内部出现**柔和的流动高光带**，不是剧烈变形——玻璃质感，不是液体质感。

### 4.2 渲染设置
- Geometry：`IcosahedronGeometry(1, 5)`（细分比 LiquidOrb 高一档，让 rim glow 的边缘更平滑，因为球面更接近完美圆）。
- Material：`ShaderMaterial({...})`，自定义 vertex + fragment。**沿用 ADR-009 Effect 自持 scene 的模型**。
- `transparent: true`, `depthWrite: false`, `side: DoubleSide`（玻璃感需要看穿背面）。
- 新增 uniform（与 LiquidOrb 区分）：
  - `uTime`, `uVolume`, `uBass`, `uTreble`, `uPitch`, `uSpeechActivity` — 与 LiquidOrb 相同含义
  - `uRimColor` — fresnel rim 主色（默认 `#d946ef` 玫瑰粉）
  - `uCoreColor` — 球体内部核心色（默认 `#c4b5fd` 浅紫）
  - `uHighlightColor` — 内部高光带色（默认 `#fbcfe8` 浅粉）
  - `uRimWidth` — fresnel 宽度（默认 0.55，slider 暴露）
  - `uHighlightStrength` — 高光带强度（默认 1.0，slider 暴露）
  - `uRefractionIntensity` — 模拟折射/重影强度（默认 0.35，slider 暴露，**仅 fresnel + 双层叠加实现，不引真折射**）

### 4.3 Vertex shader 要点
- 极轻微的 `sin(time * 0.5) * 0.015` 形变（比 LiquidOrb 的 0.25 distortion 小一个数量级），保证玻璃球看起来基本是圆。
- 暴露 `vNormal`, `vViewPosition`, `vWorldPosition` 给 fragment。

### 4.4 Fragment shader 要点
- **fresnel rim**：`pow(1.0 - dot(normal, viewDir), uRimWidth)` 控制 rim 宽度，`uRimColor` 着色，rim 内侧叠加一圈衰减 glow。
- **核心色**：`uCoreColor` 作为基础色，与 `mix(coreColor, highlightColor, highlightFactor)` 混合。
- **高光带**：用一个 `sin(normalize(worldPos).y * 6.0 + uTime * 0.4) * 0.5 + 0.5` 这样的横向扫描带，受 `uHighlightStrength * uSpeechActivity` 调制（说话时才出现）。
- **折射近似**：在 fragment 内对 `vWorldPosition` 做一次轻微折射偏移采样（用同一 mesh 的二次渲染或 fresnel 偏移，没真折射就纯颜色叠加），受 `uRefractionIntensity` 控制。
- 最终颜色按 `uOpacity` 与 stage 颜色做混合（注意白底 stage 下需要正确的 alpha 混合）。

### 4.5 音频响应
- `uVolume` → 整体轻微脉冲（scale += volume * volumeSensitivity * 0.08，比 LiquidOrb 的 0.5 小很多——玻璃不大幅呼吸）。
- `uBass` → rim 微微鼓起；不驱动 deformation。
- `uTreble` → rim 颜色饱和度提升（用 `mix(rimColor, white, treble * 0.3)` 之类近似）。
- `uPitch` → 高光带纵向位置微调。
- `uSpeechActivity` → 高光带强度（核心驱动），没有 speech 时近似为零。

### 4.6 控件定义（9 控件 / 4 分区）
- **appearance × 3**：
  - `rimColor` (color, default `#d946ef`)
  - `coreColor` (color, default `#c4b5fd`)
  - `opacity` (slider, 0.5–1, default 0.85, step 0.05)
- **style × 2**（group 名独立于 LiquidOrb 的 motion）：
  - `rimWidth` (slider, 0.2–1.5, default 0.55, step 0.05)
  - `refractionIntensity` (slider, 0–1, default 0.35, step 0.05)
- **motion × 1**：
  - `idleSpeed` (slider, 0.1–3, default 1, step 0.1)
- **voiceResponse × 2**：
  - `volumeSensitivity` (slider, 0–2, default 1, step 0.05)
  - `speechSensitivity` (slider, 0–2, default 1.2, step 0.05)  ← 突出 speech 是 GlassOrb 的核心特征
- **light × 1**：
  - `highlightStrength` (slider, 0–3, default 1, step 0.05)
- **总数 = 3+2+1+2+1 = 9** ✅。Group 名集合 `{appearance, style, motion, voiceResponse, light}` — 比 LiquidOrb 多了 `style` 组（因 GlassOrb 强调 rim/refraction 这些"风格特征"），少了 LiquidOrb 的 bass/treble sensitivity（玻璃不对高频做形变）。

> **注**：键名不能与 LiquidOrb 的 `primaryColor/secondaryColor/distortion/bassSensitivity/trebleSensitivity/glowIntensity` 冲突。这里都用了更具体的名字。

### 4.7 注册与默认
- 文件：`src/visual/effects/GlassOrb.ts`（含 create + Definition + class + uniforms debug interface）镜像 LiquidOrb 结构。
- Shader 文件：`src/visual/shaders/glassOrb.ts`（独立的 vertex + fragment 字符串常量，不与 liquidOrb 共享）。
- `VisualStage.vue` 改为同时注册三个 Effect。**Effect 注册顺序：GlassOrb 在前**（使其成为 defaultSelectedId，不再依赖"first filter"）。
- `editorStore` 的 hardcoded `'placeholder-orb'`（TASK-005 root cause）一并清掉。
- `editorStore.syncAvailableEffects(availableIds, defaultId)` 行为不变；只是 defaultId 现在自然落到 GlassOrb 上。

---

## 5. 文件清单

### 5.1 新增
- `src/visual/effects/GlassOrb.ts`
- `src/visual/shaders/glassOrb.ts`

### 5.2 修改
- `src/visual/types.ts` — `EffectDefinition` 增加可选字段 `preferredStageStyle`（不进 ADR，按需处理；若用户挑剔需走临时授权）
- `src/visual/VisualEngine.ts` — `setEffect(id)` 内根据新 Effect 的 `preferredStageStyle` 触发 stageStyle 切换（仅在未 user override 时）
- `src/stores/editor.ts` — 新增 `stageStyle: 'dark'|'light'`、`userOverrideStageStyle: boolean`、`setStageStyle(s)`；清掉 hardcoded `'placeholder-orb'` 默认值
- `src/components/editor/VisualStage.vue` — `<section :data-stage-bg="stageStyle">`；scoped 样式中 `[data-stage-bg="light"]` 覆写 `background` 与 text color；添加 GlassOrb import + register
- `src/components/layout/AppHeader.vue`（或合适 Header 组件）— 增加 Dark/Light 切换 toggle，调 `setStageStyle`
- `src/styles/tokens.less`（如必要）— 新增 `--color-bg-stage-light` 与对应 text 色 token
- `docs/` 或 `.cursor/` 内任何 registry/list 文件（如有）— 注册 GlassOrb

### 5.3 不动
- `src/audio/**`、`src/stores/audio.ts`、现有 LiquidOrb shader、所有测试（如有）

---

## 6. 验收标准

### 6.1 功能验收（必须全过）
1. ✅ 刷新页面默认进入 GlassOrb + light stage，**白底舞台**清晰可见，**球体居中**。
2. ✅ Inspector 显示 GlassOrb 的 9 控件，自动按 `style / appearance / motion / voiceResponse / light` 分区可见（不是 hardcoded 四分区——因为多了一个 `style` 区）。
3. ✅ Stage 右上角的 toggle 切换 Dark/Light：点 Light → 舞台变白、GlassOrb 的 rim 不消失、文字仍可读；点 Dark → 舞台变深色、rim 仍可见、文字对比度足够。
4. ✅ 在 Effect Selector 切到 LiquidOrb → 自动恢复 Dark stage；切到 PlaceholderOrb → Dark。在两个 Effect 之间来回切，stage 跟随 preferredStageStyle。
5. ✅ 手动 toggle 切到 Light 后，切 Effect **不**覆盖手动选择（userOverrideStageStyle=true）。
6. ✅ GlassOrb 默认状态下视觉接近参考图 1（粉紫 rim 边、内部柔软高光、球体基本是圆）。
7. ✅ Inspector 控件的 live update：动 `rimWidth` 看 rim 边缘粗细变化；动 `opacity` 看透度变化；动 `speechSensitivity` 在 dev console 触发 fake speech（沿用 LiquidOrb 的 fake audio 路径如有，没有则用 audio 静音 + 静音也写不进 → 用更简单的"设置 store 临时手动改 audio state"——若不可行改用 `?demo=1` query 参数触发 engine 内的 sine wave fake audio，或跳过 fake audio 验证，仅以静态参数截图对比为视觉验收）。
8. ✅ LiquidOrb + PlaceholderOrb 行为完全不变（TASK-001~005 验收仍成立）。

### 6.2 视觉验收（必须全过）
> **测试要求**：Process lesson from TASK-005 — 任何"默认页面状态"相关的验收都必须由 Cursor 主动跑 headless 截图，**不能只交 Reviewer 验证**。本 Task 的视觉验收强制要求 Cursor 提供：
1. ✅ **白底 light stage + GlassOrb**：默认加载截图（virtual time ≥ 3 s，确保 stable 状态），背景明显为白/极浅灰；球体粉紫 rim 清晰可见。
2. ✅ **黑底 dark stage + GlassOrb**：用户手动切到 Dark 的截图，球仍可见（rim 在深色下可能要稍调亮，验证 Cursor 在 dark 下也调过 param；不应"白底好看黑底消失"）。
3. ✅ **黑底 dark stage + LiquidOrb**（回归）：与 TASK-005 fix 后的截图一致，无回归。
4. ✅ 截图存放路径：`.cursor/reports/TASK-006-light.png`、`TASK-006-dark-orb.png`、`TASK-006-dark-liquid.png`，并在 `.cursor/reports/TASK-006.md` 报告里 inline 引用。
5. ✅ 截图工具沿用 TASK-005 已证可用的命令：`msedge.exe --headless --use-angle=swiftshader --enable-unsafe-swiftshader --screenshot=...png --virtual-time-budget=3500 --window-size=1400,900 http://localhost:18801/`（端口以 dev server 实际端口为准）。

### 6.3 架构合规
- ✅ no `from 'three'` outside `src/visual/**`
- ✅ no `requestAnimationFrame` outside `VisualEngine.ts`
- ✅ AudioData not in Pinia
- ✅ GlassOrb controls key names do not collide with LiquidOrb

---

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 双层 shader 写法复杂度高，GlassOrb shader 调试耗时长 | 严格限制在 ADR-009 范围：vertex 几乎不变，fragment 只实现 5 个效果层（rim + core + highlight + refraction 近似 + final mix）。cursor 调试时优先保证 visible，不要追求物理精确。 |
| light stage 下 Inspector 文字可能不可读 | tokens.less 增加 light stage text 颜色变量。验收 §6.1.3 强制检查该项。 |
| EffectDefinition.preferredStageStyle 字段要进 types.ts 是否需要新 ADR | 不需要。这是 VisualSettings 形状之外的、Effect 元数据；按 ADR-009 的"Effect 自持 scene"扩展。如果 Reviewer 严格要求 ADR，可走临时授权（同 ADR-009/010 模式）。 |
| Effect 切换动画抖动 | 不在本 Task，登记为后续候选。`setEffect` 直接替换 scene，不做过渡。 |
| LiquidOrb regression（TASK-001~005 验收失守） | §6.2.3 强制截屏对比，验收项不可豁免。 |

---

## 8. 验收产物清单（Cursor 提交时必须包含）

`.cursor/reports/TASK-006.md` 必须包含：
1. **What was implemented** — 与本 spec §4、§5 1:1 对照列差异。
2. **Default-page observations** — §6.1.1 的描述 + §6.2.1 截图 inline。
3. **Stage 切换行为** — §6.1.3、6.1.4、6.1.5 的描述 + §6.2.1/2 截图 inline。
4. **Regression check** — §6.2.3 截图 inline + 与 TASK-005 fix 截图肉眼对比说明（"球体居中、颜色范围与 TASK-005 fix 一致"等）。
5. **Architecture compliance** — 4 条架构合规的逐条 ✅/N/A 自查。
6. **Open issues** — 已知遗留，按风险表里的口径走。

---

## 9. Task 完成定义（DoD）

- [ ] §6.1 八条全过
- [ ] §6.2 五条截图全有且视觉合格
- [ ] §6.3 四条架构合规全过
- [ ] §8 报告齐全
- [ ] Reviewer（WorkBuddy）独立 headless 截图复现至少 §6.2.1 + §6.2.3 两张

---

## 10. 与后续 Task 的衔接（已记 STATUS）

后续 TASK-007+ 候选：
- AuroraOrb（图 2 黑底极光带球）
- StarburstOrb（图 3 黑底星爆球）
- Effect 切换平滑过渡（PROJECT_SPEC §7）
- Post-processing / bloom（需独立 Task + 可能 ADR）
- Preset 存读（ARCHITECTURE §16）
- 麦克风接线（AudioAnalyzer.start → Header Mic 按钮）
- userOverrideStageStyle 的 localStorage 持久化
