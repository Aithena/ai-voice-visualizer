# Cursor 工程实施规范

本文件是 Cursor 在 `ai-voice-visualizer` 中写代码时的**实施规范**。

- Codex 描述「实现什么、为什么这样实现」。Source of Truth：`.codex/`
- Cursor 描述「如何实现、代码落在哪、怎么测」。工作空间：`.cursor/` + `src/`

不要在本目录重复完整的 Codex 架构文档。需要产品/架构细节时，去读对应的 `.codex/*.md`。

---

## 0. 最高优先级：不得修改 `.codex/`

Cursor **默认不得创建、修改、删除、重命名** `.codex/` 内的任何文件。

包括但不限于：

```text
.codex/README.md
.codex/STATUS.md
.codex/DECISIONS.md
.codex/PROJECT_SPEC.md
.codex/ARCHITECTURE.md
.codex/TECHNICAL_SPEC.md
.codex/DATA_MODEL.md
.codex/tasks/**
.codex/reviews/**
```

如果实现过程中发现：

- 架构文档互相冲突
- Task 验收标准无法落地
- ADR 与当前 Task 矛盾
- 需要改 Task / STATUS / DECISIONS

**先停下来问用户。** 由用户决定是否让 Codex 改 `.codex/`。Cursor 不得自行改架构文档来迁就代码。

Cursor 可以写的地方：

```text
.cursor/**     实施规则、实现笔记、任务进度
src/**         业务代码
public/**      静态资源
package.json / vite.config.* / tsconfig.* / 样式与构建配置
测试文件
```

---

## 1. Cursor 的角色

Cursor 是本项目的：

**Senior Frontend Engineer / Coding Agent**

负责：

- 按当前 Task 实现代码
- Vue 组件、Pinia、样式、布局
- AudioAnalyzer / VisualEngine / Three.js / Inspector / Preset
- 运行、测试、Debug、性能与资源释放
- 在 `.cursor/` 记录实现细节与偏差

不负责：

- 改产品定位
- 换技术栈
- 推翻 ADR
- 把实现细节回写成新的架构 Source of Truth
- 修改 `.codex/`
- 一次实现多个 Task

协作：

```text
User
  ↓
Codex = Architecture / Spec / Task / Review
  ↓
Cursor = Implementation / Testing / Debugging
  ↓
src/ = Actual Implementation
```

---

## 2. 每次写代码前的读取顺序

不要全库扫描。按当前 Task 最小范围阅读。

```text
1. .codex/STATUS.md
2. .codex/tasks/当前 TASK-XXX.md
3. .codex/DECISIONS.md
4. 当前 Task 相关的 .codex 架构文档
5. .cursor/README.md（本文件）
6. 已有源代码（只读相关模块）
```

当前 Codex 文档索引（以实际文件为准，不要读已不存在的旧文件名）：

| 文档 | 何时读 |
| --- | --- |
| `.codex/STATUS.md` | 每个任务开始时必读 |
| `.codex/tasks/TASK-XXX.md` | 实现该 Task 时必读 |
| `.codex/DECISIONS.md` | 涉及架构边界时必读 |
| `.codex/ARCHITECTURE.md` | 模块边界、数据流、目录、性能、生命周期 |
| `.codex/TECHNICAL_SPEC.md` | 接口契约、runtime、错误处理 |
| `.codex/DATA_MODEL.md` | 数据类型所有权、持久化边界 |
| `.codex/PROJECT_SPEC.md` | 产品体验、布局、Effect、Inspector、验收 |
| `.codex/README.md` | 需要确认协作边界时再读 |
| `.codex/reviews/TASK-XXX-review.md` | Review 后修代码时再读 |

旧文件名不要再作为索引：

- `.codex/ai-voice-visualizer-技术架构与开发规范.md`
- `.codex/AI_Voice_Visualizer_Cursor_需求.md`
- `.codex/步骤.md`

如果 Codex 文档与代码冲突：

1. 指出冲突（文档要求 vs 当前代码）
2. 本次是否处理、不处理的原因
3. 核心架构冲突不要默默重构，问用户

已知历史冲突：原始需求曾提到 React。架构已确定 **Vue 3**。实现以 ADR / ARCHITECTURE 为准。

---

## 3. 当前项目状态

以 `.codex/STATUS.md` 为准。本段只作实施提醒，不替代 STATUS。

- Current Task: **TASK-001 — Project Foundation**
- Status: **PLANNED**
- Phase: Foundation
- 仓库目前还没有 `src/` 业务代码
- TASK-001 只建应用骨架，**不实现** Microphone / AudioAnalyzer / VisualEffect / Shader / Preset

一次只做当前 Task。做完后停止，等待 Codex Review。不要自行开始 TASK-002。

---

## 4. 技术栈（不可擅自更换）

- Vue 3
- TypeScript
- Vite
- Less
- Element Plus
- Pinia
- Three.js
- Web Audio API

禁止：

- 换成 React / CSS-in-JS / 纯 CSS 动画作为核心视觉
- 引入后端、账号、多包 monorepo、无必要状态库
- 用 GIF / 视频 / 预渲染动画代替实时 VisualEngine
- 为「未来 SDK」提前拆 npm package

MVP 优先保证：

```text
声音 → 视觉
```

这条链路足够漂亮、稳定。TASK-001 阶段则先保证编辑器骨架可运行。

---

## 5. 必须遵守的架构边界

```text
Vue 3          → UI / Editor
Pinia          → Editor State（可持久配置，不是逐帧 AudioData）
Web Audio API  → Audio Analysis
VisualEngine   → Voice → Visual Mapping + Runtime 协调
Three.js/GLSL  → Real-time Rendering
```

两条链路必须分开：

```text
Editor:
User → Vue → Pinia VisualSettings → VisualEngine

Runtime:
Microphone → AudioAnalyzer → AudioData → VisualEngine.update() → Three.js render()
```

硬约束（来自 ADR，不得静默推翻）：

| ADR | 约束 |
| --- | --- |
| ADR-001 | Vue 3 是 UI 层，不拥有实时渲染循环 |
| ADR-002 | Vue / Pinia 不得驱动每一帧动画 |
| ADR-003 | Pinia 不保存逐帧 `volume/bass/mid/treble/pitch` |
| ADR-004 | 核心视觉用 Three.js；禁止 GIF/视频/预渲染代替 |
| ADR-005 | Effect 走统一 contract + registry，不为 3 个 Effect 写死系统 |
| ADR-006 | Inspector 由 Schema/Definition 驱动，不按 Effect 硬编码面板 |
| ADR-007 | Element Plus 只提供控件，不决定产品视觉 |
| ADR-008 | 要改架构必须新 ADR；Cursor 不得改 `.codex/DECISIONS.md` |

实现时必须：

- Vue 组件不直接创建 `AudioContext`
- Vue 组件不直接持有 Scene / Mesh / Shader 的完整生命周期细节
- Effect 不是 Vue 组件
- Inspector 只改 Editor Settings，不重建整个 Scene
- 已有模块能承载时，不要另起平行 Analyzer / Engine / Store / Inspector

---

## 6. 写代码时用的核心契约

权威定义在 `.codex/ARCHITECTURE.md`、`.codex/TECHNICAL_SPEC.md`、`.codex/DATA_MODEL.md`。这里只保留落地时必须记住的形状。

### 6.1 AudioData（runtime-only，0..1）

```ts
interface AudioData {
  volume: number
  bass: number
  mid: number
  treble: number
  pitch: number
  speechActivity: number
}
```

- 不进 Pinia 逐帧状态
- 不进 Preset
- 不作为 UI 的主响应式数据源
- Audio / Visual 状态条如需展示，用低频同步，不要 60 FPS 写 Store

### 6.2 AudioAnalyzer

- 生命周期：`start()` / `stop()` / `dispose()`
- 与 Vue 解耦
- 明确处理权限拒绝、设备缺失、AudioContext suspended
- 释放 MediaStream / AudioContext / AudioNodes

### 6.3 VisualEffect

所有 Effect 必须可 `init/mount → update → resize → dispose`。

当前 Codex 对方法签名有两份表述，**未统一前不要自行发明第三套**。见第 15 节「已知文档冲突」。TASK-001 不实现 Effect，先搭目录边界即可。

第一版 Effect：`LiquidOrb` / `GlassWave` / `EnergyCore`。必须走 registry，禁止在应用各处 `if (effect === '...')` 写死。

### 6.4 VisualEngine

拥有：renderer / scene / camera、Effect 注册与切换、接收 AudioData、应用 Voice Response、update、render、resize、dispose。

正确循环：

```text
requestAnimationFrame
  → AudioAnalyzer.getAudioData()
  → VisualEngine.update()
  → Three.js render()
```

禁止：

```text
AudioAnalyzer → Pinia → Vue reactive → Three.js
```

Shader 优先接收：`uVolume` `uBass` `uMid` `uTreble` `uPitch` `uSpeechActivity` `uTime`。

视觉不是「声音大 → 球变大」。要表达 Energy / Emotion / Personality。Idle 保持轻微呼吸，不能完全静止。

### 6.5 VisualSettings / Inspector

Editor-level、可进 Pinia / Preset。分组：

- Appearance
- Motion
- Voice Response
- Light

Inspector 读 `EffectDefinition.controls` 生成控件。改参数立即生效，没有 Apply。只更新 Uniform / Material / Light / Scale，不重建 Scene。

### 6.6 Preset

可序列化：effect id + settings + metadata。禁止序列化 MediaStream、AudioContext、Three.js 对象、AudioData。MVP 用 `localStorage`。TASK-001 不做 persistence。

---

## 7. 推荐目录（按需创建，不要一次建空壳大全）

以 `.codex/ARCHITECTURE.md` 为准：

```text
src/
├── components/
│   ├── editor/
│   ├── inspector/
│   ├── effects/          # Effect 选择 UI，不是 Three.js Effect 实现
│   └── common/           # BaseSlider / BaseColorPicker 等封装
├── views/
├── stores/
├── audio/
│   ├── AudioAnalyzer.ts
│   ├── PitchDetector.ts
│   └── types.ts
├── visual/
│   ├── VisualEngine.ts
│   ├── VisualEffect.ts
│   ├── types.ts
│   ├── effects/
│   │   ├── LiquidOrb.ts
│   │   ├── GlassWave.ts
│   │   └── EnergyCore.ts
│   ├── shaders/
│   └── postprocessing/
├── presets/
├── types/
├── utils/
└── styles/               # Design Tokens、Theme、Element Plus 覆盖
```

TASK-001 只需建立后续模块能放进去的骨架，不要提前实现 Audio/Visual 业务。

---

## 8. TASK-001 实施要点

目标：可启动的 Vue 3 + TS + Vite 编辑器壳。后续 Audio / Visual / Inspector 有稳定落点。

### In Scope

- Vue 3 + TypeScript + Vite
- Less
- Element Plus（深色定制，不是默认 Admin 皮肤）
- Pinia 作为后续 Editor State 基础
- Three.js 只建立 **依赖与目录边界**，不把 render loop 塞进 Vue UI 组件
- 深色三栏布局：Effects | Visual Stage | Inspector
- Visual Stage / Effect Selector / Inspector 占位
- 基础 responsive（桌面三栏；移动端 Stage → Selector → Inspector/Drawer 结构即可）

### Out of Scope

Microphone、AudioContext、AudioAnalyzer、FFT、Pitch、Speech Activity、三个 Effect、Shader、Voice Mapping、Preset、Import/Export、SDK、Backend、Auth。

### UI

```text
┌──────────────────────────────────────────────┐
│ Header / Toolbar                             │
├──────────────┬──────────────────┬────────────┤
│ Effect       │   Visual Stage   │ Inspector  │
│ Selector     │   （占位）        │ （占位）    │
└──────────────┴──────────────────┴────────────┘
```

视觉：near-black、少噪音、Stage 是视觉中心、避免卡片堆叠和过度圆角、不要廉价霓虹。

### 验收（实现后必须自检）

- 项目能由开发者启动
- TS / Vite 配置有效
- 没有无关依赖
- 主编辑页存在，三栏可见
- UI 组件里没有 Three.js render-loop
- 没有逐帧 AudioData state
- 没有 Audio Engine / Visual Effect 实现

做完：报告 Changed / Added / Tested / Issues / Next，然后停止。

---

## 9. 性能与资源（后续 Task 也必须遵守）

目标：**60 FPS**。

禁止：

- 每帧 Vue / Pinia 更新驱动动画
- 循环内大量分配对象
- 不必要的 Scene / Geometry / Material 重建
- 未 dispose 的 WebGL / Audio / RAF / MediaStream

页面或 Effect 销毁时：

```text
cancelAnimationFrame
  → dispose Effect
  → dispose Three.js resources
  → stop MediaStream
  → close / suspend AudioContext
```

设置变化只更新必要参数。优先 GPU / GLSL。

优先级：

```text
视觉质量 > 实时性能 > 架构可扩展性 > 代码简单程度
```

核心链路不好看、不稳定时，不要继续堆功能。也不要为未来 SDK 过度抽象。

---

## 10. UI / Element Plus

Element Plus 只用于 Editor primitives：Slider、ColorPicker、InputNumber、Select、Tabs、Button、Switch、Dialog、Drawer。

需要产品化封装，例如：

```text
src/components/common/BaseSlider.vue
src/components/common/BaseColorPicker.vue
src/components/common/BaseNumberInput.vue
```

Visual Stage 不用 Element Plus。

风格：Premium / Minimal / Dark / Technical / Clean。不要普通 Admin Dashboard。

---

## 11. 编码规则

- TypeScript 优先，避免 `any`
- `AudioData`、`VisualSettings`、`EffectDefinition`、`ControlDefinition`、`VisualPreset` 必须类型化
- Audio / Three.js 逻辑不进 `.vue`
- 样式用 Less + Design Tokens，避免大量 inline style
- 封装 Element Plus，避免各处直接吃默认主题
- 错误处理：麦克风拒绝、设备缺失、AudioContext 暂停、页面隐藏、资源释放、无效 Preset、Effect/Renderer 初始化失败；失败后不能停在半运行状态
- 不要为了简单把逻辑塞进单个 Vue 组件
- 一次 Task 不顺手重构、不顺手装依赖、不顺手做下一个 Task
- 局部 bug / 泄漏 / 类型错误可以直接修；不要把修 bug 扩大成换架构

---

## 12. 开发流程

## 12.1 开发服务器端口规则

Vite 开发服务器不得使用默认端口 `5173`。

项目开发服务器必须使用 `18801-18899` 范围内的端口。配置里始终把首选端口写成 `18801`；被占用时在该范围内自动顺延，不要把顺延结果写回配置。

### Port Configuration

端口属于 Vite / Development Environment 配置。脚手架阶段写入 `vite.config.ts`，之后保持不变：

```ts
server: {
  port: 18801,
  strictPort: false,
}
```

规则：

1. `server.port` 固定为 `18801`，表示首选端口，不是「当前机器上碰巧空闲的端口」。
2. `strictPort` 必须为 `false`，允许 18801 被占用时自动顺延到 `18802`、`18803`…。
3. 实际可用端口必须落在 `18801-18899`。不得落到 `5173` 或其他范围外端口。
4. 不要在启动后把顺延得到的端口写回 `vite.config.ts`。下次启动仍从 `18801` 开始尝试。
5. 如果 `18801-18899` 全部被占用，则停止启动，并向用户明确报告端口范围已无可用端口。
6. 不得为了获得端口而强制终止、kill 或修改其他正在运行的进程。
7. 不要在业务代码中硬编码开发服务器端口。

如果需要修改端口策略，只改 `vite.config.*` 中与开发服务器端口直接相关的配置，不要顺手修改其他构建配置。

### Development Server

启动开发服务器时，使用上述配置。Vite 会先尝试 `18801`；占用则自动顺延。

启动后确认实际端口：

- 在 `18801-18899` 内：正常使用，并在报告中记录实际端口。
- 落到 `5173` 或 `18899` 之后：停止当前开发服务器，向用户报告，不要继续使用范围外端口。

配置端口被占用时，顺延即可，不必先问用户。不要 kill 其他进程。

### Completion Report

启动开发服务器并完成验证后，在任务报告的 `Tested` 部分明确记录**实际**端口，例如：

```text
Dev Server: http://localhost:18806  (preferred 18801, occupied)
```

以本次启动确认的实际端口为准，不要写成配置中的首选端口（除非二者相同）。


## 12.2 Task 执行与 Review 流程

```text
读 STATUS + 当前 Task
  → 读相关 Codex 文档 + 本文件
  → 检查已有代码，避免平行实现
  → 只实现当前 Task
  → 运行最小验证
  → 按第 13 节报告
  → 停止，等待 Codex Review
```

Codex Review 分级：

- `CRITICAL`：必须修
- `HIGH`：优先修
- 不要用新架构替代 Review 要求的修复

Review 文件只读：`.codex/reviews/TASK-XXX-review.md`。Cursor 修代码，不改 Review 原文。

---

## 13. 完成任务后的报告

每次完成当前 Task、测试、或根据 Codex Review 完成修复后，Cursor 必须生成结构化最终报告。

报告必须同时满足：

1. 完整报告写入对应的 Markdown 文件（如果当前 Task 有对应文档要求）。
2. 在当前 Cursor 对话中输出一份简洁、独立、可直接复制的报告摘要。
3. 报告摘要必须放在当前回复的最后。
4. 报告之后不得继续输出额外解释、建议、新 Task 或无关日志。
5. 报告必须使用固定格式，方便用户快速定位并复制。
6. 不要在最终报告中混入大量过程日志、工具输出或无关分析。

### 13.1 Copy-Friendly Report Block

最终回复必须包含以下固定结构：

```text
========== TASK REPORT ==========

Task:
TASK-XXX

Status:
COMPLETED / CHANGES_REQUIRED / BLOCKED

Summary:
一句话说明本次完成了什么。

Changed:
- ...

Added:
- ...

Removed:
- ...

Tested:
- ...

Issues:
- None
或
- ...

Next:
等待 Codex Review

==================================
```

### Copy-Friendly Rule

`TASK REPORT` 必须作为当前回复中最后一个独立内容块。

用户应该能够在 Cursor 对话中快速定位最后一个 `TASK REPORT`，并使用 Cursor 的复制功能一次性复制完整报告。

不要在 `TASK REPORT` 后继续输出：

- 额外解释
- 下一步推测
- 新 Task
- 无关日志
- 其他 Markdown 内容

### Report Content Rules

报告必须准确反映本次 Task 的实际结果。

- `Changed`：列出实际修改的文件或模块。
- `Added`：列出实际新增的文件或功能。
- `Removed`：列出实际删除的文件或功能；没有则写 `None`。
- `Tested`：列出实际执行的验证命令和结果。
- `Issues`：列出已知问题、阻塞项或文档与代码冲突；没有则写 `None`。
- `Next`：说明下一步，例如 `等待 Codex Review`。
- 不得声称执行了没有实际执行的测试。
- 不得声称功能已经完成而实际没有完成。

### Review 修复报告

如果当前工作是根据：

```text
.codex/reviews/TASK-XXX-review.md
```

进行修复，报告必须额外包含：

```text
Review:
TASK-XXX-review.md

Review Status:
FIXED / PARTIALLY_FIXED / BLOCKED
```

并明确列出：

- 修复了哪些 Review 项目。
- 哪些 Review 项目仍未解决。
- 执行了哪些重新验证。
- 是否需要再次进行 Codex Review。

Cursor 不得修改 Review 原文。

Review 文件保持：

```text
.codex/reviews/TASK-XXX-review.md
```

只读。

---

## 插入后的章节关系

你当前 README 已经有：

```text
12. 开发流程
├── 12.1 开发服务器端口规则
└── 12.2 Task 执行与 Review 流程

13. 完成任务后的报告

14. .cursor/ 文档分工
15. 已知文档冲突
16. Source of Truth 优先级
17. 最重要原则
```

因此：

**不要再新增 `12.3`。**

直接用本文件内容，替换你当前 README 的：

```text
## 13. 完成任务后的报告

### Changed
...
### Added
...
### Removed
...
### Tested
...
### Issues
...
### Next
...
```

---

## 14. `.cursor/` 文档分工

| 文件 | 职责 |
| --- | --- |
| `README.md` | 本文件：写代码必须遵守的实施规范 |
| `TASKS.md` | 当前实现进度（需要时再创建） |
| `IMPLEMENTATION.md` | 重要实现细节、坑、与规范的偏差（需要时再创建） |
| `CODING_RULES.md` | 更细的编码约定（需要时再创建） |
| `CHANGELOG.md` | 实现历史（需要时再创建） |

可以写入 Cursor 文档：

- 当前 Task 与代码落点
- 与规范的偏差
- 运行和测试方式
- 资源释放、性能、浏览器限制

不要写入：

- 完整 PRD / 完整架构重述
- 擅自新增的 ADR

---

## 15. 已知文档冲突（Cursor 不得自行定案）

实现到相关 Task 时必须先问用户，是否需要 Codex 统一文档。在统一前，TASK-001 只建立边界，不实现这些接口。

### 冲突 A — VisualEffect 生命周期签名

`.codex/ARCHITECTURE.md`：

```ts
init(container: HTMLElement): void
update(audioData: AudioData, settings: VisualSettings): void
```

`.codex/TECHNICAL_SPEC.md`：

```ts
mount(context: VisualEffectContext): void
update(audio: AudioData, deltaTime: number): void
```

### 冲突 B — VisualSettings 形状

`.codex/ARCHITECTURE.md` 给出四组固定结构（appearance / motion / voiceResponse / light）。

`.codex/DATA_MODEL.md` 写字段是 effect-specific，由 `ControlDefinition` 定义。

这两处需要架构裁定后才能在后续 Task 里落地类型。Cursor 不修改 `.codex/` 来消解冲突。

---

## 16. Source of Truth 优先级

```text
User / Product Decision
  >
.codex/ 架构与 ADR
  >
.cursor/ 实施规则
  >
src/ 当前代码
```

冲突时：说明冲突、引用文档、给出建议、等待用户决策。不要 silently 选边。

---

## 17. 最重要原则

不要为了「快速完成」牺牲架构。

不要让 Vue 控制 Three.js 每一帧。

不要让 Pinia 保存实时 AudioData。

不要让 Element Plus 决定产品视觉。

不要修改 `.codex/`。需要改文档时先问用户。

这个项目不是普通 Audio Visualizer。它是：

> A visual design system for AI voice interfaces.

第一阶段成功标准（后续 Audio/Visual Task，不是 TASK-001）：

用户打开网页 → 点击麦克风 → 开始说话 → 中央 AI Visualizer 真实、流畅、漂亮地跟随声音变化。
