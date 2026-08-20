# 技术架构与开发规范

> Project: `ai-voice-visualizer`
>
> 本文档定义项目的软件架构、模块职责、数据流、运行时边界、性能约束与可扩展性原则。
> Codex / Cursor 的工作方式由 `.codex/README.md` 定义，本文件不重复定义 Agent 工作流。

---

## 1. Architecture Overview

产品定位：

> **A visual design system for AI voice interfaces.**

核心技术链路：

```text
Microphone
    ↓
AudioAnalyzer
    ↓
AudioData
    ↓
VisualEngine
    ↓
VisualEffect
    ↓
Three.js / GLSL
    ↓
Real-time Visual
```

编辑器链路：

```text
User Interaction
    ↓
Vue 3 UI
    ↓
Pinia Editor State
    ↓
VisualSettings
    ↓
VisualEngine
    ↓
Current VisualEffect
```

必须保持两条链路的职责分离：

- UI / Editor State 是编辑器运行时。
- Audio / Visual Render 是实时运行时。
- 实时 AudioData 不进入 Vue / Pinia 的逐帧响应式链路。

---

## 2. Technology Stack

项目固定使用：

- Vue 3
- TypeScript
- Vite
- Less
- Element Plus
- Pinia
- Three.js
- Web Audio API

未经用户明确架构决策，不得替换核心技术栈。

### 技术职责

| Technology | Responsibility |
|---|---|
| Vue 3 | UI、Editor、Inspector、交互 |
| TypeScript | 类型系统、核心数据模型、接口 |
| Vite | 开发与构建 |
| Less | Layout、Theme、Design Tokens、Responsive |
| Element Plus | Editor UI primitives |
| Pinia | Editor State / Settings / Preset State |
| Web Audio API | Microphone / Audio Analysis |
| VisualEngine | Audio → Visual Mapping + Runtime Coordination |
| Three.js | Real-time Rendering |
| GLSL | Shader-based Visual Effects |

Element Plus 不得决定产品整体视觉风格。

---

## 3. Core Architecture Boundaries

### Vue 3

负责：

- 页面结构
- Editor UI
- Effect Selector
- Inspector
- Preset UI
- Microphone 控件
- Modal / Drawer
- 用户交互

禁止：

- 驱动每一帧 Three.js 动画
- 每帧写入 Pinia AudioData
- 直接管理 AudioContext 的实时分析循环
- 直接实现核心 Visual Effect

### Pinia

负责：

- 当前 Effect
- Editor State
- Visual Settings
- Preset State
- UI 状态
- Microphone 状态

禁止：

```ts
audioStore.volume = volume
```

这类逐帧 AudioData 更新。

### Web Audio API / AudioAnalyzer

负责：

- Microphone
- AudioContext
- AnalyserNode
- FFT
- Volume
- Bass
- Mid
- Treble
- Pitch
- Speech Activity
- Smoothing / Normalization

AudioAnalyzer 必须与 Vue 解耦。

### VisualEngine

负责：

- Render Runtime
- 当前 Effect 生命周期
- AudioData → Visual Response
- Effect 切换
- Render Loop 协调
- Resize
- Resource Cleanup

VisualEngine 不负责 UI。

### Three.js

负责：

- Scene
- Camera
- Renderer
- Mesh
- Material
- Shader
- Particle
- Glow
- Distortion
- Lighting
- Post Processing

核心视觉必须实时生成。

---

## 4. Runtime Data Flow

### Audio Runtime

```text
Microphone
    ↓
MediaStream
    ↓
AudioContext
    ↓
AnalyserNode
    ↓
AudioAnalyzer
    ↓
AudioData
```

### Visual Runtime

```text
AudioData
    ↓
Voice Response Mapping
    ↓
VisualSettings
    ↓
VisualEffect.update()
    ↓
Shader Uniforms / Mesh / Material / Particle
    ↓
Three.js Render
```

### Editor Runtime

```text
User
    ↓
Vue Component
    ↓
Pinia
    ↓
VisualSettings
    ↓
VisualEngine
```

Editor Runtime 与 Real-time Runtime 不得通过逐帧 reactive update 耦合。

---

## 5. AudioData Contract

统一 AudioData：

```ts
export interface AudioData {
  volume: number
  bass: number
  mid: number
  treble: number
  pitch: number
  speechActivity: number
}
```

所有字段统一归一化到：

```text
0 ~ 1
```

AudioData 属于 **frame-level / ephemeral data**。

它：

- 不进入 Preset
- 不作为 Pinia 的逐帧状态
- 不作为 UI 的主要响应式数据源

---

## 6. Audio Analysis

第一版使用：

```text
navigator.mediaDevices.getUserMedia()
AudioContext
AnalyserNode
FFT
```

推荐频段：

```text
Bass
20 - 250 Hz

Mid
250 - 2000 Hz

Treble
2000 - 12000 Hz
```

### Volume

使用 RMS 或等效能量计算。

### Speech Activity

第一版使用：

- Volume threshold
- Energy
- Smoothing

不需要语音识别。

核心目标：

> 不需要知道用户说了什么，只需要知道用户“怎么说”。

### Pitch

第一版可以使用：

- Autocorrelation
- YIN
- 轻量级 pitch detection library

输出：

```text
0 ~ 1
```

第一版不要求专业音频设备级精度。

---

## 7. VisualEngine

VisualEngine 是实时视觉运行时的核心协调层。

职责：

```text
AudioData
    ↓
Mapping
    ↓
Current Effect
    ↓
Three.js
```

VisualEngine 必须：

- 独立于 Vue Component
- 独立于 Pinia reactive rendering
- 管理 Effect 生命周期
- 管理 Render Loop
- 管理 Resize
- 管理资源释放

VisualEngine 不应包含具体 Effect 的大量视觉实现。

---

## 8. VisualEffect Contract

所有 Effect 必须遵循统一接口。

```ts
export interface VisualEffect {
  id: string
  name: string

  init(container: HTMLElement): void

  update(
    audioData: AudioData,
    settings: VisualSettings
  ): void

  resize(width: number, height: number): void

  dispose(): void
}
```

Effect 必须具备：

- 独立生命周期
- 独立参数
- 独立渲染逻辑
- 可切换
- 可销毁
- 可扩展

Effect 不应成为 Vue Component。

---

## 9. Current Visual Effects

第一版：

```text
LiquidOrb
GlassWave
EnergyCore
```

未来可扩展：

```text
Particle
Wave
Fire
Fluid
Nebula
Ring
Avatar
其他 AI Visual Effect
```

不得针对三个 Effect 写死整个系统。

---

## 10. Effect Definition

Inspector 必须 Schema-driven。

核心模型：

```text
EffectDefinition
    ↓
ControlDefinition[]
    ↓
Inspector
    ↓
VisualSettings
    ↓
VisualEngine
```

示例：

```ts
export interface EffectDefinition {
  id: string
  name: string
  defaultSettings: VisualSettings
  controls: ControlDefinition[]
}
```

```ts
export interface ControlDefinition {
  key: string
  label: string
  type: 'slider' | 'color' | 'switch' | 'select'
  min?: number
  max?: number
  step?: number
}
```

新增 Effect 时：

```text
NewEffect
+
EffectDefinition
+
DefaultSettings
```

不应重新设计 Inspector。

---

## 11. VisualSettings

统一配置：

```ts
export interface VisualSettings {
  appearance: {
    primaryColor: string
    secondaryColor: string
    opacity: number
    outlineWidth: number
    outlineOpacity: number
    blur: number
    glow: number
    glowIntensity: number
    transparency: number
    coreBrightness: number
  }

  motion: {
    speed: number
    amplitude: number
    smoothness: number
    distortion: number
    pulse: number
    rotation: number
    turbulence: number
    idleMotion: number
  }

  voiceResponse: {
    volumeSensitivity: number
    bassSensitivity: number
    midSensitivity: number
    trebleSensitivity: number
    pitchSensitivity: number
    speechReactivity: number
    smoothing: number
  }

  light: {
    intensity: number
    rimLight: number
    innerLight: number
    coreLight: number
    spread: number
    falloff: number
  }
}
```

`VisualSettings` 属于 **editor-level / persistent data**。

它可以进入：

- Pinia
- Preset
- Import / Export

---

## 12. Voice → Visual Mapping

核心原则：

> 不只是“声音越大，球越大”。

必须允许：

```text
Voice
    ↓
Energy / Emotion / Personality
    ↓
Visual Expression
```

统一输入：

```text
volume
bass
mid
treble
pitch
speechActivity
```

可以映射到：

```text
scale
distortion
glow
color
wave amplitude
particle intensity
energy
rotation
animation intensity
```

### LiquidOrb

```text
Volume          → Scale
Bass            → Distortion
Treble          → Glow
Pitch           → Gradient Position
SpeechActivity  → Animation Intensity
```

### GlassWave

```text
Volume          → Scale
Bass            → Wave Amplitude
Mid             → Wave Complexity
Treble           → Light Intensity
Pitch           → Light Color
SpeechActivity  → Wave Activity
```

### EnergyCore

```text
Volume          → Core Scale
Bass            → Energy Wave
Treble          → Particle / Glow
Pitch           → Color
SpeechActivity  → Energy Pulse
```

---

## 13. Real-Time Render Loop

禁止：

```text
AudioAnalyzer
    ↓
Pinia
    ↓
Vue Reactive Update
    ↓
Three.js
```

正确方式：

```text
requestAnimationFrame
    ↓
AudioAnalyzer.getAudioData()
    ↓
VisualEngine.update()
    ↓
Three.js render()
```

目标：

**60 FPS**

Vue / Pinia 不参与每帧动画驱动。

---

## 14. GPU / Shader Strategy

核心视觉优先：

```text
Three.js
+
GLSL
```

实时 AudioData 优先通过 Shader Uniform 进入 GPU。

例如：

```text
uVolume
uBass
uMid
uTreble
uPitch
uSpeechActivity
uTime
```

适合 GPU 的计算优先放 GPU。

CPU 主要负责：

- Audio Analysis
- Mapping
- Runtime Coordination
- Editor State

禁止使用：

- GIF
- 视频素材
- 预渲染动画

模拟核心实时效果。

---

## 15. Effect Lifecycle

Effect 切换必须正确管理生命周期：

```text
Current Effect
    ↓
Deactivate / Dispose
    ↓
Release Resources
    ↓
Create New Effect
    ↓
Init
    ↓
Render
```

页面销毁时必须：

```text
cancelAnimationFrame
    ↓
dispose Effect
    ↓
dispose Three.js Resources
    ↓
Stop MediaStream
    ↓
Close / Suspend AudioContext as appropriate
```

必须防止：

- RAF 泄漏
- Event Listener 泄漏
- MediaStream 未停止
- AudioContext 泄漏
- Geometry 泄漏
- Material 泄漏
- Texture 泄漏
- WebGL Resource 泄漏

---

## 16. Inspector Architecture

Inspector 分为：

```text
Appearance
Motion
Voice Response
Light
```

数据流：

```text
Inspector
    ↓
Pinia VisualSettings
    ↓
VisualEngine
    ↓
Current Effect
```

参数修改必须实时生效。

禁止使用：

```text
Apply
```

作为必要的参数提交步骤。

修改设置时：

**不得重建整个 Three.js Scene。**

优先更新：

```text
Shader Uniform
Mesh Scale
Material Property
Light Intensity
```

---

## 17. Element Plus Boundary

Element Plus 仅作为 Editor UI primitives。

可以使用：

- Slider
- ColorPicker
- InputNumber
- Select
- Tabs
- Button
- Switch
- Tooltip
- Dropdown
- Dialog
- Drawer

需要统一封装产品视觉。

例如：

```text
components/common/BaseSlider.vue
components/common/BaseColorPicker.vue
components/common/BaseNumberInput.vue
```

Element Plus 默认样式不得成为产品 Design System。

---

## 18. Layout Architecture

Desktop：

```text
┌──────────────┬──────────────────────────┬───────────────┐
│              │                          │               │
│   Effects    │      Visual Stage        │   Inspector   │
│              │                          │               │
└──────────────┴──────────────────────────┴───────────────┘
```

Mobile：

```text
Visual Stage
    ↓
Effect Selector
    ↓
Inspector
```

移动端 Inspector 使用 Bottom Sheet / Drawer。

---

## 19. Preset Architecture

Preset 是持久化的 Visual Configuration。

```ts
export interface VisualPreset {
  id: string
  name: string
  effect: string
  settings: VisualSettings
}
```

第一版：

```text
localStorage
```

支持：

- Save
- Duplicate
- Reset
- Import
- Export

未来可以迁移到：

- IndexedDB
- Cloud Storage
- Account Sync

但 MVP 阶段不得提前引入复杂后端。

---

## 20. Recommended Source Structure

推荐结构：

```text
src/
├── components/
│   ├── editor/
│   ├── inspector/
│   ├── effects/
│   └── common/
│
├── views/
│
├── stores/
│
├── audio/
│   ├── AudioAnalyzer.ts
│   ├── PitchDetector.ts
│   └── types.ts
│
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
│
├── presets/
│
├── types/
│
├── utils/
│
└── styles/
```

该目录结构是推荐架构，不代表必须一次性创建全部文件。

---

## 21. Performance Principles

优先级：

```text
Visual Quality
    >
Real-time Response
    >
Architecture Extensibility
    >
Code Simplicity
```

但 MVP 不允许为了“未来 SDK”过度工程化。

禁止：

- 每帧 Vue State 更新
- 每帧 Pinia AudioData 更新
- 大量 DOM animation
- 不必要的 Scene 重建
- 不必要的对象创建
- 不必要的 Geometry / Material 重建
- 未释放 WebGL Resource

目标：

```text
60 FPS
```

---

## 22. MVP Architecture Priority

第一阶段只需要保证：

```text
Microphone
    ↓
AudioAnalyzer
    ↓
AudioData
    ↓
VisualEngine
    ↓
Three.js
    ↓
AI Visual
```

如果核心声音 → 视觉链路不稳定或视觉质量不足：

**不要继续增加非核心功能。**

优先级：

```text
Visual Quality
    >
Real-time Response
    >
Interaction Quality
    >
Parameter Quantity
```

---

## 23. Future Extensibility

未来可以形成：

```text
AI Voice Visualizer
    ↓
Visual Presets
    ↓
Voice → Visual Mapping
    ↓
Visual Engine
    ↓
SDK
    ↓
Web / Mobile / Automotive / Smart Display
```

架构应保持 Visual Engine 与 UI 解耦。

但 MVP 阶段：

- 不提前拆 npm package
- 不建立复杂 backend
- 不建立账号系统
- 不引入无必要状态管理

---

## 24. Architecture Decisions Owned Elsewhere

重要、不可随意推翻的架构决策记录在：

```text
.codex/DECISIONS.md
```

本文件描述当前架构。

如果当前代码与本文档冲突：

**不要自行修改架构。**

由 Codex 根据 `.codex/DECISIONS.md` 与用户产品决策进行判断。
