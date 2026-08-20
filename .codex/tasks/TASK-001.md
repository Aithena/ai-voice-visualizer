---
id: TASK-001
status: PLANNED
created: 2026-08-20
---

# TASK-001 — Project Foundation

## Objective

建立 `ai-voice-visualizer` 的第一版前端项目基础，使后续 Audio Engine、Visual Engine、Inspector 和 Effect System 有稳定的应用骨架。

## Context

项目采用：

- Vue 3
- TypeScript
- Vite
- Less
- Element Plus
- Pinia
- Three.js
- Web Audio API

本 Task 只建立 Foundation，不实现真正的实时音频视觉效果。

## Scope

### In Scope

- 应用基础结构
- Vue 3 + TypeScript application shell
- Vite integration
- Less foundation
- Element Plus integration
- Pinia integration
- Three.js dependency/integration boundary
- 深色编辑器布局
- 基础三栏 Editor Layout
- Visual Stage 占位区域
- Effect Selector 占位区域
- Inspector 占位区域
- 基础 responsive structure

### Out of Scope

- Microphone
- AudioContext
- AudioAnalyzer
- FFT
- Pitch Detection
- Speech Activity
- LiquidOrb
- GlassWave
- EnergyCore
- Shader implementation
- Voice Response Mapping
- Preset persistence
- Import / Export
- SDK
- Backend
- Authentication

## Architecture

遵循：

```text
Vue 3
  ↓
UI Layer

Pinia
  ↓
Editor State

Three.js
  ↓
Future Visual Runtime
```

本 Task 不建立每帧 Audio → Visual 数据流。

## Implementation Requirements

1. 保持 Vue 3 + TypeScript + Vite 技术栈。
2. 使用 Less 作为样式预处理器。
3. 使用 Element Plus 作为基础编辑器控件来源。
4. Element Plus 默认主题不得直接成为产品视觉语言。
5. 使用 Pinia 作为后续 Editor State 的基础。
6. Three.js 应保持在独立的 runtime boundary，不把 Three.js 核心逻辑塞进普通 Vue UI 组件。
7. 建立清晰、可扩展的目录结构。
8. 不为未来功能提前实现复杂业务逻辑。
9. 不添加与当前 Task 无关的依赖。

## Suggested UI Structure

```text
┌──────────────────────────────────────────────┐
│ Header / Toolbar                             │
├──────────────┬──────────────────┬────────────┤
│ Effect       │                  │ Inspector  │
│ Selector     │   Visual Stage   │            │
│              │                  │ Controls   │
│              │                  │            │
└──────────────┴──────────────────┴────────────┘
```

布局不是最终视觉稿，但必须体现三栏编辑器的基本信息层级。

## Design Requirements

- Near-black / dark editor aesthetic.
- Minimal visual noise.
- Visual Stage is the primary focus.
- Inspector is secondary.
- Effect selection must be obvious.
- Avoid generic admin-dashboard appearance.
- Avoid excessive cards and rounded containers.

## Acceptance Criteria

### Project

- Project structure is valid.
- TypeScript configuration is valid.
- Vite configuration is valid.
- Application can be started by the developer.
- No unrelated dependencies are introduced.

### UI

- Main editor page exists.
- Three-column structure is visible.
- Center Visual Stage exists as a clear placeholder.
- Effect Selector exists.
- Inspector exists.
- Dark visual foundation is present.

### Architecture

- UI components do not contain Three.js render-loop implementation.
- No per-frame AudioData state exists.
- No Audio Engine is implemented in this Task.
- No visual effect implementation is included.

## Testing Requirements

Cursor should perform the minimum relevant validation required to confirm the acceptance criteria after implementation.

Do not expand testing into future Audio/Visual functionality.

## Completion

After implementation:

1. Verify the acceptance criteria.
2. Report changed files and validation results.
3. Stop.
4. Wait for Codex review.

Do not implement TASK-002 or future tasks.

## Notes

If an architecture conflict is discovered, do not silently redesign the architecture. Report the conflict for architectural decision.
