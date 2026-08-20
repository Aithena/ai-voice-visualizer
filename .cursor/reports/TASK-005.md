# TASK-005 Report

Status: COMPLETED

## Summary

实现首个产品效果 LiquidOrb（自定义 ShaderMaterial：紫粉渐变、fresnel glow、vertex noise 形变、呼吸缩放），默认选中；并修复 TASK-004 LOW-1（`applyCurrentEffect` init 失败回退到上一成功效果，避免死锁）。

## Changed

- `src/visual/index.ts`：导出 `liquidOrbDefinition` / `createLiquidOrb` / `LiquidOrb`
- `src/components/editor/VisualStage.vue`：先注册 LiquidOrb 再注册 PlaceholderOrb（默认 `liquid-orb`）；`applyCurrentEffect` try/catch 回退；抑制 setEffect 后的冗余 `updateSettings`

## Added

- `src/visual/effects/LiquidOrb.ts`：9 个 controls，ADR-009 契约，uniform 脏检查
- `src/visual/shaders/liquidOrb.ts`：GLSL 顶点/片元；Ashima simplex 3D noise（webgl-noise，公有域）
- `scripts/verify-liquid-orb.ts`

## Removed

- None

## Tested

- `npm run build`：vue-tsc + Vite production build 通过
- `npx tsx scripts/verify-liquid-orb.ts`：LiquidOrb self-check passed
  - 9 个 control key 齐全；slider 默认值 ∈ [min, max]
  - stub context 下 init/update 不抛错
  - 静音 AudioData：uVolume/uBass = 0
  - 合成响度（volume=1, bass=0.8, treble=0.6, pitch=0.7, speech=1）：对应 uniform 命中，uDistortion / uGlowIntensity 高于静音基线
  - 连续 24 次 update 无 NaN
  - dispose 后 scene.children 为空，重复 dispose 不抛错
- grep：`requestAnimationFrame` 仅 `VisualEngine.ts`
- grep：`from 'three'` 仅 `src/visual/**`
- grep：`src/stores` 无 AudioData
- grep：`VisualEngine` 仅 `VisualStage.vue` import
- Inspector / Selector / store / Header 未改（注册后 UI 自动出现 9 控件）
- LOW-1：失败时 `console.error` + 回退 `lastGoodEffectId`，否则回退 `placeholder-orb`；`skipSelectionWatch` 避免 watch 递归。未入库临时抛错工厂；Node 自检未挂 Vue 组件
- 本环境无有界面浏览器做 Behavioral Requirements 1–8 肉眼验收，由 Review 侧 headless 补位

## Issues

- 麦克风仍未接入；voiceResponse 通路已由合成 AudioData 自检覆盖，页面上只能看到 idle
- Effect 切换无平滑过渡、无 bloom 后处理（规范 Out of Scope）
- GLSL noise 来源：Ashima Arts / Ian McEwan, https://github.com/ashima/webgl-noise （公有域）

## Next

等待 WorkBuddy Review。对 WorkBuddy 说：`Review TASK-005`
