# Project Memory — ai-voice-visualizer

## 角色与协作模式（用户裁定 2026-08-20，同日修订）

- **WorkBuddy 角色**：只接架构师角色（Think → Specify → Review），接替原 Codex 职能
- **实现归 Cursor**——用户明确表示「你写的代码没 Cursor 好」，不要主动写业务代码
- **文件边界（用户明确授权）**：可写 `.codex/STATUS.md`、`.codex/tasks/`、`.codex/reviews/`（协作锚点，每个 Task 开始/结束时按协议更新，Review 报告正式落点）；其余 `.codex/**`（含 DECISIONS.md）、`.cursor/**` 严格只读；`src/`、配置文件只读（Review 时最小范围读取）
- `.workbuddy/` 只保留 `memory/`（早期建立的平行工作区已于 2026-08-20 清理删除）
- 状态机单一事实源回归 `.codex/STATUS.md`；新 Task 规范写 `.codex/tasks/`；Review 报告写 `.codex/reviews/`
- `.codex/` 其余文档冻结为历史知识库，ADR-001~010、TASK-001/002/003 规范、Review 报告继续有效；`DECISIONS.md` 默认不可写——**仅 2026-08-20 获一次性临时授权录入 ADR-009/010，授权已关闭**，今后新 ADR 仍需用户中转或再次授权
- 用户是 WorkBuddy ↔ Cursor 之间的转交桥梁

## 项目关键事实

- 产品：AI Voice Visualizer——AI 语音界面的视觉设计系统（非普通 Audio Visualizer）
- 技术栈固定：Vue3 + TS + Vite + Less + Element Plus + Pinia + Three.js + Web Audio API
- 核心纪律：Vue/Pinia 不驱动每帧渲染；AudioData 是 ephemeral 不进 Pinia/Preset；Inspector Schema 驱动；Effect 走统一契约 + registry
- Dev server 端口 18801-18899 为纪律性约定（首选 18801，禁止 5173）；**2026-08-20 用户裁定：端口策略以现行代码为准**（strictPort: false，允许自动顺延），上限不再由配置强制
- 文档冲突已裁定并正式录入：**ADR-009/010 已写入 .codex/DECISIONS.md（2026-08-20，用户一次性临时授权，已关闭）**。ADR-009 = `init(context: VisualEffectContext)` + `update(audio, deltaTime, settings)`，Effect 自持 scene、引擎持 renderer/camera；ADR-010 = VisualSettings = Effect-specific 平铺键值，由 EffectDefinition.controls 声明，Inspector 四分区是 ControlDefinition.group
- **Cursor 完成报告交接约定（2026-08-20 起）**：Cursor 完成后写 `.cursor/reports/TASK-XXX.md`（不再粘贴到聊天）；用户说「Review TASK-XXX」时我直接读该文件，再独立核对源码与验收，Review 写 `.codex/reviews/`。`.cursor/reports/README.md` 记录了此约定。旧格式 `========== TASK REPORT ==========`（.cursor/README.md 第 13 节）已被此交接点取代

## 当前状态（权威源：.codex/STATUS.md，由我维护）

- TASK-001：**COMPLETED**（2026-08-20 端口问题经用户裁定关闭：现行代码为准）
- TASK-002：**COMPLETED**（2026-08-20 Review APPROVED，报告在 .codex/reviews/TASK-002-review.md）
- TASK-003：**COMPLETED**（2026-08-20 Review APPROVED，0 必改 4 INFO，报告在 .codex/reviews/TASK-003-review.md；运行时独立验证 = headless Edge 截图 + md5 对比 → 球体居中且两帧不同，证明动画运转）
- TASK-004：**COMPLETED**（2026-08-20 Review APPROVED，0 必改 3 INFO + 2 LOW，报告在 .codex/reviews/TASK-004-review.md；运行时独立验证 = headless Edge 截图 1400×900 完整 UI——四分区 + 6 控件 + Selector 禁用态 + Reset 启用全可见；LOW-1 是 applyCurrentEffect 缺 try/catch 兜底 INIT_FAILED，将随产品效果实现变得重要）
- TASK-005：**COMPLETED**（2026-08-20 fast-track APPROVED，1 行 fix 已修：VisualStage.vue:123 加 `editorStore.selectEffect(defaultId)` + 删冗余 `applyCurrentEffect()`；报告在 .codex/reviews/TASK-005-review.md 头部加 Fix Verification 段；独立验证 = 3s/6s headless Edge 截图都显示完整紫粉渐变球 + DOM dump 9 控件四分区全在；LiquidOrb 正式成为默认效果——首个产品效果落地）
- **快速流程约定**（TASK-005 创立）：对 1-2 行 fix 类修订，可走"快速流程"——不另开新 Task 规范、不重走完整 Review，由 Cursor 改完贴截图 + 我独立截图确认即可，在原 review 报告头部加 Fix Verification 段
- **流程教训（已记入未来 Task 规范模板）**：写 Task 规范时若验收涉及「页面默认状态」，Testing Requirements 必须要求 Cursor 自跑 headless 截图（不是只给 Reviewer 补位）——TASK-005 的默认效果 bug 30 秒就能在 self-check 阶段抓出
- 验证备忘：本环境可借 Windows Edge headless（swiftshader）做 WebGL 视觉验证；`msedge.exe --headless --use-angle=swiftshader --enable-unsafe-swiftshader --screenshot=...png --virtual-time-budget=ms` 拍多帧 + md5sum 对比可证动画存在，无需 Playwright/Puppeteer
- 环境备忘：本机 safe-delete shim 拦截 Vite 清空 dist/，构建前需手动 `rm -rf dist`
