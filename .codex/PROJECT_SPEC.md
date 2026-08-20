# 项目产品规范

> Project: `ai-voice-visualizer`
>
> 本文档定义产品目标、核心体验、MVP 范围、用户能力与验收标准。
> 技术实现细节由 `.codex/ARCHITECTURE.md` 定义。

---

## 1. Product Definition

产品名称：

**AI Voice Visualizer**

产品定位：

> **A visual design system for AI voice interfaces.**

它不是普通 Audio Visualizer。

它的核心目标是：

> 将 AI Voice 转换成具有视觉人格的实时动态表现。

核心表达：

```text
Voice
    ↓
Energy / Emotion / Personality
    ↓
Visual Expression
```

用户最终看到的不是简单的：

```text
声音变大
    ↓
球变大
```

而应该感觉：

```text
AI 正在听
AI 正在思考
AI 正在回应
```

---

## 2. Product Goal

建立一个 Web-based Visual Editor，让用户能够：

1. 选择 AI Voice Visual Effect
2. 通过 Inspector 编辑视觉参数
3. 使用麦克风实时驱动视觉
4. 调整 Voice → Visual Response
5. 实时预览变化
6. 保存 Visual Preset
7. Duplicate / Reset Preset
8. Import / Export JSON

最终形态：

> **AI Voice Visual Effect Playground / Visual Editor**

---

## 3. Core User Experience

用户打开页面后：

```text
Open
  ↓
See Visual Stage
  ↓
Select Effect
  ↓
Enable Microphone
  ↓
Speak
  ↓
Visual reacts in real time
  ↓
Edit parameters
  ↓
Preview immediately
  ↓
Save Preset
```

核心体验必须满足：

- Visual Stage 足够大
- AI Visual 是页面视觉中心
- 说话时视觉明显响应
- 停止说话后自然回到 Idle
- 参数调整立即生效
- 三种 Effect 有明确视觉差异
- 整体感觉像专业设计工具，而不是表单

---

## 4. Product Layout

Desktop：

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo / AI Voice Visualizer          Mic    Reset    Export  │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  Effects     │                              │   Inspector   │
│              │                              │               │
│  ● Liquid    │       Visual Stage           │ Appearance    │
│  ○ Glass     │                              │ Motion        │
│  ○ Energy    │          AI Core             │ Voice         │
│              │                              │ Light         │
│              │                              │               │
├──────────────┴──────────────────────────────┴───────────────┤
│              Audio / Voice Activity Indicator               │
└─────────────────────────────────────────────────────────────┘
```

### Desktop

三栏：

```text
Effects
    +
Visual Stage
    +
Inspector
```

### Mobile

```text
Visual Stage
    ↓
Effect Selector
    ↓
Inspector
```

Inspector 在移动端可以使用 Bottom Sheet / Drawer。

---

## 5. Visual Effects

MVP 必须包含三个 Effect。

### 5.1 LiquidOrb

产品概念：

> 柔软、液态、具有生命感的 AI 能量球。

视觉特征：

- 紫 / 蓝 / 粉色系
- 柔和渐变
- 半透明
- Glow
- 轻微形变
- 呼吸感
- 有机运动

Voice Response：

```text
Volume
    → Scale

Bass
    → Distortion

Treble
    → Glow

Pitch
    → Gradient Position

Speech Activity
    → Animation Intensity
```

Idle：

> 保持轻微呼吸，不完全静止。

---

### 5.2 GlassWave

产品概念：

> 深色透明玻璃球，内部具有动态光带 / 声波。

视觉特征：

- 深色透明材质
- Glassmorphism
- 蓝紫色光
- 动态波形
- 极细轮廓光
- Premium / Apple-like

Voice Response：

```text
Volume
    → Scale

Bass
    → Wave Amplitude

Mid
    → Wave Complexity

Treble
    → Light Intensity

Pitch
    → Light Color

Speech Activity
    → Wave Activity
```

停止说话后：

- 波形逐渐平静
- Glow 降低

---

### 5.3 EnergyCore

产品概念：

> 更强烈的 AI Energy Core。

视觉特征：

- 紫蓝色
- 中央核心
- 能量波
- 粒子
- 光环
- Energy Pulse
- 更强烈的声音反馈

Voice Response：

```text
Volume
    → Core Scale

Bass
    → Energy Wave

Treble
    → Particle / Glow

Pitch
    → Color

Speech Activity
    → Energy Pulse
```

---

## 6. Inspector

Inspector 是产品核心功能之一。

分为：

```text
Appearance
Motion
Voice Response
Light
```

### Appearance

包括：

- Primary Color
- Secondary Color
- Gradient
- Opacity
- Outline Width
- Outline Opacity
- Blur
- Glow
- Glow Intensity
- Transparency
- Core Brightness

### Motion

包括：

- Animation Speed
- Amplitude
- Smoothness
- Distortion
- Pulse
- Rotation
- Turbulence
- Idle Motion

### Voice Response

这是最重要的编辑区域：

- Volume Sensitivity
- Bass Sensitivity
- Mid Sensitivity
- Treble Sensitivity
- Pitch Sensitivity
- Speech Reactivity
- Response Smoothing

用户应该能够控制：

```text
Audio Data
    ↓
Response Strength
    ↓
Visual Expression
```

### Light

包括：

- Glow
- Bloom
- Light Intensity
- Rim Light
- Inner Light
- Core Light
- Light Spread
- Light Falloff

---

## 7. Real-Time Editing

所有参数修改必须实时生效。

禁止依赖：

```text
Apply
```

按钮才能看到结果。

用户：

```text
拖动 Slider
    ↓
Visual 立即变化
```

用户：

```text
修改 Color
    ↓
Visual 立即变化
```

用户：

```text
修改 Voice Sensitivity
    ↓
下一帧开始反映变化
```

切换 Effect：

> 必须有平滑的视觉过渡，不应突然闪烁。

---

## 8. Audio Interaction

用户可以：

```text
Enable Microphone
```

第一次启用时请求浏览器麦克风权限。

状态：

```text
Ready
Listening
```

核心体验：

```text
Ready
    ↓
Enable Microphone
    ↓
Listening
    ↓
Speak
    ↓
Visual Response
```

必须考虑：

- 用户拒绝权限
- 麦克风不存在
- AudioContext 被浏览器暂停
- 页面离开
- Stop Microphone

第一版不需要语音识别。

重点：

> 识别用户“怎么说”，而不是“说了什么”。

---

## 9. Audio Data

MVP 需要：

```text
volume
bass
mid
treble
pitch
speechActivity
```

统一：

```text
0 ~ 1
```

这些数据用于：

```text
Voice → Visual Mapping
```

而不是用于语音转文字。

---

## 10. Preset

用户可以保存当前 Visual Configuration。

Preset 至少包含：

```text
id
name
effect
settings
```

支持：

- Save
- Duplicate
- Reset
- Import
- Export

第一版：

```text
localStorage
```

Preset 的目标是：

> 保存一个可以再次使用的 AI Voice Visual Style。

例如：

```text
Neon Assistant
Glass AI
Purple Core
```

---

## 11. MVP Scope

### In Scope

#### Editor

- 三栏 Editor
- Effect Selector
- Visual Stage
- Inspector
- Microphone Control
- Audio Activity Indicator

#### Visual

- LiquidOrb
- GlassWave
- EnergyCore

#### Audio

- Microphone
- Volume
- Bass
- Mid
- Treble
- Pitch
- Speech Activity
- Smoothing

#### Editing

- Appearance
- Motion
- Voice Response
- Light

#### Preset

- Save
- Duplicate
- Reset
- Import
- Export
- localStorage

#### Quality

- Real-time response
- 60 FPS target
- Responsive layout
- Error handling
- Resource cleanup

---

## 12. Out of Scope

MVP 不包含：

- 语音识别 / Speech-to-Text
- AI 对话模型
- TTS 服务
- 用户账号
- 云端 Preset
- 复杂 Backend
- SDK Package
- 多人协作
- 复杂 Timeline
- 视频导出
- 社交分享系统
- Marketplace

这些可以作为未来产品方向，但不应影响 MVP 核心链路。

---

## 13. MVP Success Criteria

最重要的成功标准：

> 用户打开网页 → 点击麦克风 → 开始说话 → 中央 AI Visualizer 真实、流畅、漂亮地跟随声音变化。

必须能够：

1. 打开网页
2. 看到专业的 AI Visualizer
3. 启用麦克风
4. 对着电脑说话
5. Visualizer 随声音变化
6. 切换 Liquid / Glass / Energy
7. 三种效果明显不同
8. 调整 Speed
9. 调整 Glow
10. 调整 Color
11. 调整 Voice Sensitivity
12. 调整 Smoothing
13. 所有变化实时反映
14. 保存 Preset
15. Duplicate / Reset
16. Export JSON
17. Import JSON
18. 刷新后产品仍保持专业、完整、可用

---

## 14. Product Quality Priority

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

如果：

```text
Voice → Visual
```

这一核心体验不好：

**不要继续增加功能。**

视觉质量优先于参数数量。

---

## 15. Design Direction

整体视觉方向：

- Near Black
- Dark Gray
- Subtle Border
- Minimal Radius
- Premium Typography
- Restrained Glow
- Large Visual Stage
- 精致参数控件
- 大面积留白

避免：

- 廉价 AI 科技感
- 大量霓虹边框
- 过度渐变
- 巨大标题
- 卡片堆叠
- 过度圆角
- 过度 Glow

核心视觉焦点：

> **中央 Visual Stage。**

参考产品气质：

- Figma
- Framer
- Apple Motion
- After Effects
- Linear

这些是视觉方向参考，不代表复制其 UI。

---

## 16. Product Boundary

本产品不是：

> Audio Player

不是：

> Speech-to-Text

不是：

> AI Chat

不是：

> 普通 Audio Visualizer

而是：

> **AI Voice Visual Effect Playground / Visual Editor**

核心能力：

```text
Voice
    ↓
Analysis
    ↓
Mapping
    ↓
Visual Personality
    ↓
Editable Visual System
```

---

## 17. Future Direction

MVP 成熟后，可以继续发展：

```text
Visual Effects
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

未来目标：

> 将 Visual Engine 从一个 Playground 演化成可复用的 AI Voice Interface Visual System。

但：

**未来 SDK 化不是 MVP 的实现目标。**

---

## 18. Product Decision Boundary

产品方向由：

```text
User / Product Decision
```

决定。

技术架构由：

```text
.codex/ARCHITECTURE.md
.codex/DECISIONS.md
```

定义。

Cursor 的实现必须服从上述产品与架构约束。

如果产品需求与现有架构发生冲突：

> 不应偷偷修改架构，应先提出冲突并等待产品 / 架构决策。

---

## 19. MVP Definition of Done

MVP 只有在以下条件同时满足时才算完成：

```text
Editor 可用
    +
Microphone 可用
    +
Audio Analysis 可用
    +
三个 Effect 可用
    +
Voice Response 可用
    +
Inspector 可用
    +
Preset 可用
    +
实时性能稳定
    +
Resource Cleanup 正确
    +
核心视觉达到产品质量
```

最终判断不是：

> “代码能运行。”

而是：

> **“它是否已经像一个真正的 AI Voice Visual Editor。”**
