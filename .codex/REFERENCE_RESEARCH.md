# Reference Research

> Project: `ai-voice-visualizer`
>
> Purpose: record a one-time external reference study before implementation.
>
> This document is **reference material, not architecture authority**. Existing product and architecture decisions remain authoritative unless a new ADR is explicitly accepted.

---

## 1. Research Objective

研究与 `ai-voice-visualizer` 高度相关的开源项目，重点观察：

- AI Voice UI 的状态表达
- Voice → Visual 的映射方式
- Orb / Blob / Glass / Energy 等视觉形态
- Three.js / WebGL / GLSL 的使用方式
- 实时性能策略
- Effect / Configuration / API 的可扩展方式

核心问题：

> **如何让 AI 的视觉表现从普通 Audio Visualizer 演化为具有状态、能量和人格的 Voice Interface Visual System？**

本次研究以公开 README / 文档为主，不把第三方项目源码直接作为本项目架构依据。

---

## 2. Key Findings

### 2.1 Voice UI 应该有“语义状态”，而不仅是 Audio Level

多个相关项目都采用 `idle / listening / thinking / speaking` 等状态。`orb-ui` 特别强调：状态是语义层，音量是运动层；两者应该分开。citeturn0search7

建议本项目未来形成：

```text
VoiceVisualState
        +
AudioData
        +
VisualSettings
        ↓
VisualEngine
```

而不是单纯：

```text
AudioData → Visual
```

### 2.2 “Speaking” 不应该等于 “Volume > Threshold”

AI 是否正在 listening / thinking / speaking 应由上层 Voice Runtime State 决定；AudioData 负责表达实时强度。

这能避免“麦克风噪声导致 AI 看起来正在说话”这类语义错误。

### 2.3 Shader 是核心视觉能力

`bit2zero/Orb` 使用 Three.js、WebGL shaders 和 GLSL，并将实时音频与 3D Orb 结合。`desertcache/samantha-ui` 同样采用 Three.js + 手写 GLSL，并让 GPU 驱动的球体形态随语音和状态变化。citeturn0search0turn0search4

这与本项目当前的：

```text
AudioAnalyzer
→ VisualEngine
→ Three.js / GLSL
```

方向一致。

### 2.4 Audio Source 应该保持可扩展

`voice-orb-visualizer` 同时提供 Microphone 和 Assistant Audio 两种模式，并强调 60fps、可定制和 TypeScript。citeturn0search1

因此未来可以抽象：

```text
AudioSource
    ↓
AudioAnalyzer
    ↓
AudioData
```

MVP 仍然只实现 Microphone，不提前扩大范围。

### 2.5 Customization 是核心能力

相关项目普遍允许调整 color、speed、intensity、glow、size、sensitivity 等参数。`voiceorbs` 还把 state、amplitude、bass、mid、treble、speed、color 等作为统一可配置接口。citeturn0search10

这进一步验证本项目采用：

```text
EffectDefinition
+
ControlDefinition
+
Inspector
```

的方向。

### 2.6 AI State 可以成为视觉系统的一等公民

`thinking-orbs` 将 AI 活动拆成多个语义状态，并提供 speed、theme、variant、pause、reduced-motion、offscreen pause 等控制。citeturn0search8

这说明未来 Visual Effect 不应该只有 Audio → Animation，而应该支持：

```text
State → Base Visual Behavior
Audio → Real-time Modulation
```

---

## 3. Reference Projects

### 3.1 `aguscruiz/voiceorb`

GitHub: https://github.com/aguscruiz/voiceorb

项目定位是 AI conversation feedback UI POC，使用 Three.js + GLSL，并定义 Idle、Listening、Thinking、Speaking 四种状态，同时支持 microphone 与 TTS output 的实时反应。citeturn0search2

**值得借鉴：**

- AI State → Visual State
- Microphone / TTS 双向音频思路
- Shader-driven Orb

**不直接采用：**

- 其 POC 结构
- 其组件结构
- 其技术栈细节

---

### 3.2 `bit2zero/Orb`

GitHub: https://github.com/bit2zero/Orb

结合 Gemini Live Audio、Three.js、WebGL shaders、GLSL 和 bloom，实现实时音频响应的 3D Orb。citeturn0search0

**值得借鉴：**

```text
Audio
 ↓
GPU / Shader
 ↓
Orb
```

**不采用：**

- 其 UI framework
- 其 AI provider architecture
- 其具体业务实现

---

### 3.3 `OrbitingBucket/voice-orb-visualizer`

GitHub: https://github.com/OrbitingBucket/voice-orb-visualizer

强调 Microphone Input、Assistant Audio、Organic Animation、Customization、Responsive 和 60fps，并提供 TypeScript API。citeturn0search1

**重要启发：**

未来 Audio Analyzer 不应概念上绑定 Microphone：

```text
AudioSource
 ↓
AudioAnalyzer
 ↓
AudioData
```

MVP 只实现 Microphone。

---

### 3.4 `desertcache/samantha-ui`

GitHub: https://github.com/desertcache/samantha-ui

采用 React + Three.js + GLSL，GPU-driven sphere 会在 organic blob、thinking、liquid silk 等状态之间变化，并随 assistant voice 实时反应。citeturn0search4

**重要启发：**

视觉效果可以由：

```text
Base State
+
Audio Modulation
+
State Modulation
```

共同产生，而不是所有参数都直接由音量控制。

---

### 3.5 `alexanderqchen/orb-ui`

GitHub: https://github.com/alexanderqchen/orb-ui

其 Voice Agent UI 生命周期包含：

```text
idle
connecting
listening
thinking
speaking
error
```

并明确把 State 与 Audio / Motion 分层。citeturn0search7

**重要启发：**

未来可考虑：

```ts
type VoiceVisualState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
```

MVP 先使用核心四态。

---

### 3.6 `Schoolees/thinking-orbs`

GitHub: https://github.com/Schoolees/thinking-orbs

提供多个 AI activity 状态，并支持 speed、theme、variant、pause、reduced-motion，以及 offscreen/background-tab pause。citeturn0search8

**值得借鉴：**

- State-driven visual design
- Reduced motion
- Offscreen/background optimization
- Imperative rendering API

**不直接采用：**

- Canvas 2D 实现
- 其状态集合
- 其组件 API

---

### 3.7 `amunozdev/voiceorbs`

GitHub: https://github.com/amunozdev/voiceorbs

统一了 voice orb 的 state contract，并支持 live amplitude、bass/mid/treble、speed、color 等配置；还强调通过实时引用避免不必要的 UI re-render。citeturn0search10

**重要启发：**

这与本项目的实时边界高度一致：

```text
AudioData
 ↓
Runtime
```

而不是：

```text
AudioData
 ↓
Vue Reactive
 ↓
Render
```

---

### 3.8 `xqetsia/VoiceOrb`

GitHub: https://github.com/xqetsia/VoiceOrb

将 Idle、Listening、Talking 分别表达为不同的 color、glow、motion、particle 状态。citeturn0search6

**重要启发：**

AI 状态不应只通过 scale 表达，可以组合：

```text
Color
Glow
Motion
Particle
Scale
```

共同形成 Visual Personality。

---

## 4. Cross-Project Conclusions

### Conclusion A — State 与 Audio 必须分层

推荐：

```text
VoiceVisualState
        +
AudioData
        +
VisualSettings
        ↓
VisualEngine
        ↓
VisualEffect
```

### Conclusion B — 不要把音量当成 AI 状态

```text
State
→ 语义

AudioData
→ 强度 / 细节 / 动态
```

### Conclusion C — Three.js / GLSL 方向成立

多个高相关项目采用 WebGL / GLSL / Three.js，验证当前技术路线具有合理性。citeturn0search0turn0search4turn0search2

### Conclusion D — Schema-driven customization 有价值

相关项目普遍允许颜色、速度、强度、Glow、Sensitivity 等参数，因此当前 Inspector / Definition 架构方向合理。citeturn0search1turn0search10

### Conclusion E — Performance 应作为一等约束

60fps、GPU rendering、shader-driven animation、避免不必要 UI render、offscreen pause 和资源 cleanup 都值得纳入后续实现规范。citeturn0search1turn0search8

---

## 5. What We Should NOT Copy

### 不改变技术栈

不要因为参考项目使用 React / React Three Fiber / Zustand 等而改变当前项目技术栈。

本项目继续使用：

```text
Vue 3
TypeScript
Vite
Less
Element Plus
Pinia
Three.js
Web Audio API
```

### 不直接复制 UI

第三方项目的 Layout、Color Palette、Component Structure、Naming 只能作为参考，不能直接复制。

### 不提前实现 Backend

STT、LLM、TTS、WebSocket、WebRTC、Provider Adapter 等不属于当前 MVP。

### 不提前 SDK 化

即使参考项目已经提供 NPM Package / SDK，也不意味着本项目现在就拆包。

---

## 6. Proposed Architectural Refinement

本次研究没有发现需要推翻现有架构的理由。

但发现一个值得作为未来架构方向的模型：

```text
Current

AudioData
    +
VisualSettings
    ↓
VisualEngine
    ↓
Effect
```

未来可以演化为：

```text
VoiceVisualState
    +
AudioData
    +
VisualSettings
    ↓
VisualEngine
    ↓
Effect
```

即：

> **VoiceVisualState 应成为未来 VisualEngine 的一等输入。**

这不是当前 Task 的实现要求。

如果未来正式纳入架构，应新增 ADR，而不是直接覆盖现有决策。

---

## 7. Research Impact

| Area | Impact |
|---|---|
| Product Direction | No change |
| Core Architecture | No breaking change |
| Audio Engine | Keep current design; preserve future AudioSource extensibility |
| Visual Engine | Current design remains valid |
| Effect System | Keep common Effect contract |
| Inspector | Keep schema-driven approach |
| Performance | Reinforce 60fps / GPU / runtime separation |
| Voice State | Candidate for future ADR |
| MVP Scope | No expansion |

---

## 8. Decision Status

```text
Status: COMPLETED

Architecture Changes Required: NO

Product Direction Changes Required: NO

Immediate Implementation Changes: NO
```

The current architecture should remain frozen for implementation.

The research should not trigger additional refactoring before `TASK-001`.

---

## 9. Sources

- https://github.com/bit2zero/Orb
- https://github.com/OrbitingBucket/voice-orb-visualizer
- https://github.com/aguscruiz/voiceorb
- https://github.com/desertcache/samantha-ui
- https://github.com/alexanderqchen/orb-ui
- https://github.com/Schoolees/thinking-orbs
- https://github.com/amunozdev/voiceorbs
- https://github.com/xqetsia/VoiceOrb

---

## 10. Final Conclusion

本次研究最重要的结论不是：

> “复制哪个 Orb。”

而是：

> **AI Voice Visualizer 的核心不是 Audio Reactive Animation，而是 Voice State + Audio Response + Visual Personality 的组合。**

因此本项目最终应该形成：

```text
Voice State
      +
Audio Analysis
      +
Visual Settings
      ↓
Visual Mapping
      ↓
Visual Effect
      ↓
Real-time GPU Rendering
```

这与当前项目已经确定的产品定位和核心架构一致。

**结论：不推翻现有架构，继续进入 Task → Cursor Implementation 阶段。**
