---
id: TASK-002
status: PLANNED
created: 2026-08-20
---

# TASK-002 — Audio Foundation

## Objective

建立与 Vue UI 解耦的 `AudioAnalyzer` 基础，使后续 VisualEngine 可以读取稳定、归一化的实时音频数据。

本 Task 只实现 Web Audio 分析层，不实现 Three.js、VisualEngine、Shader 或视觉效果。

## Context

当前项目已经具备 Vue 3 + TypeScript + Vite 编辑器骨架。TASK-001 中的 Mic 按钮仍是禁用占位；本 Task 负责建立它未来依赖的 Audio runtime boundary，但不要求本 Task 接入 UI。

权威约束来自：

- `.codex/ARCHITECTURE.md`
- `.codex/TECHNICAL_SPEC.md`
- `.codex/DATA_MODEL.md`
- `.codex/DECISIONS.md`

## Scope

### In Scope

- `AudioData` runtime 类型
- `AudioAnalyzer` 类或等价模块
- 麦克风 `MediaStream` 获取
- `AudioContext` / `MediaStreamAudioSourceNode` / `AnalyserNode` 生命周期
- FFT 数据读取
- `volume`、`bass`、`mid`、`treble` 的 0..1 归一化
- 基础 `pitch` 与 `speechActivity` 输出；无法可靠识别时必须安全返回 0
- 明确的 `start()` / `stop()` / `dispose()` 生命周期
- 权限拒绝、无麦克风设备、AudioContext suspended 等错误处理
- 资源释放和重复调用安全性
- 从 `src/audio/index.ts` 导出公开类型与 analyzer

### Out of Scope

- 修改 Pinia editor store 以保存逐帧 AudioData
- 在 Vue 组件中创建或持有 `AudioContext`
- 开始/停止麦克风 UI
- VisualEngine
- Three.js / renderer / scene / effect
- Shader、Voice Response Mapping
- Preset 持久化
- 后端、SDK、账号系统
- 新增测试框架或无关依赖

## Required Contract

建议公开接口如下；如现有实现需要等价调整，必须保持语义一致：

```ts
export interface AudioData {
  volume: number
  bass: number
  mid: number
  treble: number
  pitch: number
  speechActivity: number
}

export interface AudioAnalyzerOptions {
  fftSize?: number
  smoothingTimeConstant?: number
}

export class AudioAnalyzer {
  constructor(options?: AudioAnalyzerOptions)
  start(): Promise<void>
  stop(): void
  getAudioData(): AudioData
  dispose(): Promise<void> | void
}
```

实现可以补充状态查询或错误类型，但不得把 `MediaStream`、`AudioContext`、AudioNode 或 `AudioData` 放入 Pinia 或 Preset。

## Behavioral Requirements

1. `start()` 必须请求用户麦克风权限，并在成功后建立分析节点。
2. `start()` 重复调用不得重复创建 stream、context 或 nodes；应复用或安全返回。
3. `stop()` 必须停止麦克风 track、断开节点并使后续 `getAudioData()` 返回安全的静音数据。
4. `dispose()` 必须可重复调用，并释放所有节点、track 和 AudioContext 资源。
5. 权限拒绝、设备缺失、初始化失败必须返回可识别错误，不得留下半初始化运行状态。
6. `AudioContext` 为 `suspended` 时必须显式处理；在合法用户手势调用 `start()` 的场景下尝试恢复，失败则报告错误。
7. `getAudioData()` 不得修改 Pinia，不得触发 Vue 响应式更新。
8. 所有输出值必须被限制在 `0..1`，且无输入、未启动、异常或停止状态下返回全 0 数据。
9. 频段划分应在代码中清晰可读，并保持稳定；不要把设备采样率或 FFT 数组直接泄漏给 UI。
10. `pitch` 使用当前可实现的基础算法即可；无明显周期或信号不足时返回 0，不得产生 NaN/Infinity。
11. `speechActivity` 是基础活动度指标，不要求 TASK-002 实现语音识别或语言理解。

## Architecture Constraints

- Audio 逻辑必须位于 `src/audio/`，与 Vue 解耦。
- Vue 组件不得 import 或创建 `AudioContext`。
- Pinia 只能保存编辑器配置，不保存逐帧 `volume/bass/mid/treble/pitch/speechActivity`。
- 不要在本 Task 创建 `requestAnimationFrame` 循环；调用方未来负责采样节奏。
- 不要实现任何视觉效果来“验证”音频数据。
- 不要自行裁定 `.codex/README.md` 第 15 节记录的 VisualEffect 或 VisualSettings 文档冲突。

## Suggested File Structure

```text
src/audio/
├── AudioAnalyzer.ts
├── types.ts
└── index.ts
```

允许按实现需要增加小型纯函数模块，但不要提前创建 VisualEngine 或 UI 平行实现。

## Acceptance Criteria

### Project

- `AudioAnalyzer` 与 `AudioData` 可被后续 runtime 从 `src/audio/index.ts` 导入。
- TypeScript 配置有效，生产构建通过。
- 不新增与 Audio Foundation 无关的依赖。

### Runtime

- `start()` / `stop()` / `dispose()` 生命周期行为符合上述要求。
- 成功启动后能够读取归一化 `AudioData`。
- 未启动、停止、无输入和异常状态不会抛出未处理异常或返回非法数值。
- 重复 start/stop/dispose 不泄漏资源、不创建重复节点。
- 权限失败和设备失败有明确错误路径。

### Architecture

- 无 AudioData Pinia store。
- 无 Vue 组件内的 Web Audio 逻辑。
- 无 VisualEngine、Three.js render loop、Shader 或 Effect 实现。

## Testing Requirements

Cursor 至少执行：

- `vue-tsc -b` 或项目等价类型检查；
- `vite build` 或 `npm run build`；
- 对生命周期、归一化和静音 fallback 做可重复验证。若当前项目尚无测试框架，不要为了本 Task 引入大型测试依赖；可以使用轻量纯函数测试、临时验证脚本或明确的手动验证记录；
- 记录浏览器权限拒绝、无输入/停止状态和资源释放验证结果。

## Completion

完成后：

1. 只实现 TASK-002；
2. 报告 Changed / Added / Removed / Tested / Issues / Next；
3. 停止，不开始 TASK-003；
4. 等待 Codex Review。

如果发现架构或接口冲突，不要静默改写 `.codex/` 文档；在报告中指出并停止相关扩展。
