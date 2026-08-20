# Project Memory — ai-voice-visualizer

## 角色与协作模式（用户裁定 2026-08-20，同日修订）

- **WorkBuddy 角色**：只接架构师角色（Think → Specify → Review），接替原 Codex 职能
- **实现归 Cursor**——用户明确表示「你写的代码没 Cursor 好」，不要主动写业务代码
- **文件边界（用户明确授权）**：可写 `.codex/STATUS.md`、`.codex/tasks/`、`.codex/reviews/`（协作锚点，每个 Task 开始/结束时按协议更新，Review 报告正式落点）；其余 `.codex/**`（含 DECISIONS.md）、`.cursor/**` 严格只读；`src/`、配置文件只读（Review 时最小范围读取）
- `.workbuddy/` 只保留 `memory/`（早期建立的平行工作区已于 2026-08-20 清理删除）
- 状态机单一事实源回归 `.codex/STATUS.md`；新 Task 规范写 `.codex/tasks/`；Review 报告写 `.codex/reviews/`
- `.codex/` 其余文档冻结为历史知识库，ADR-001~008、TASK-001/002 规范、TASK-001 Review 继续有效；新 ADR 因 DECISIONS.md 不可写，需用户中转或另行授权
- 用户是 WorkBuddy ↔ Cursor 之间的转交桥梁

## 项目关键事实

- 产品：AI Voice Visualizer——AI 语音界面的视觉设计系统（非普通 Audio Visualizer）
- 技术栈固定：Vue3 + TS + Vite + Less + Element Plus + Pinia + Three.js + Web Audio API
- 核心纪律：Vue/Pinia 不驱动每帧渲染；AudioData 是 ephemeral 不进 Pinia/Preset；Inspector Schema 驱动；Effect 走统一契约 + registry
- Dev server 端口必须 18801-18899，首选 18801，禁止 5173
- 已知文档冲突（待裁定，Effect Task 前必须出 ADR）：A) VisualEffect 生命周期签名；B) VisualSettings 形状
- Cursor 完成报告有固定格式 `========== TASK REPORT ==========`（.cursor/README.md 第 13 节）

## 当前状态（权威源：.codex/STATUS.md，由我维护）

- 2026-08-20 已更新 STATUS.md：写明角色交接（WorkBuddy 接替 Codex 架构角色）、TASK-001 遗留端口问题、Next Action
- TASK-001：CHANGES_REQUIRED——Vite 端口上限问题未修复（2026-08-20 复核仍存在）
- TASK-002：**COMPLETED**（2026-08-20 Review APPROVED，报告在 .codex/reviews/TASK-002-review.md）；TASK-003 PLANNED 待我起草
- 待用户裁定：工作区未提交变更——vite.config.ts（strictPort true→false）与 .cursor/README.md（改写+损坏，混入补丁指令元文本）；新端口策略与 TASK-001 Review 依据矛盾
- 环境备忘：本机 safe-delete shim 拦截 Vite 清空 dist/，构建前需手动 `rm -rf dist`
