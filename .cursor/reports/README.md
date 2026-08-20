# Cursor → WorkBuddy 交接报告

Cursor 完成一个 Task 后，把报告写在这里，而不是让用户复制聊天记录。

```text
.cursor/reports/TASK-XXX.md
```

WorkBuddy 收到用户的 `Review TASK-XXX` 后，应读取对应文件，再独立核对源码与验收，把 Review 写到 `.codex/reviews/`。

不要依赖用户粘贴 Cursor 对话。
