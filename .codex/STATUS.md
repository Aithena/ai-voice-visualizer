# Project Status

Current Task: TASK-005

Status: PLANNED (specification drafted, waiting for Cursor implementation)

Current Phase: Product Effect — LiquidOrb (first product effect; bundles TASK-004 LOW-1 fix)

Next Action:
1. Cursor implements TASK-005 per `.codex/tasks/TASK-005.md` — LiquidOrb (custom ShaderMaterial: gradient/fresnel glow/vertex-noise deformation, audio via uniforms per ARCHITECTURE §14), 9 controls across four groups, registration order making `liquid-orb` the default effect, plus LOW-1 fix (`applyCurrentEffect` try/catch with fallback to previous effect). **Zero new dependencies.**
2. Deferred candidates for later Tasks (recorded, not scheduled): smooth effect-switch transition (PROJECT_SPEC §7, engine-level, affects all effects); post-processing / bloom (would need its own Task + ADR); `three` chunk splitting (TASK-003 INFO-1); engine `resetSettings()` dead code (TASK-004 LOW-2).
3. ADR housekeeping (non-blocking): `ControlDefinition.options` shape extension remains a future ADR candidate; user to decide if/when to record in `.codex/DECISIONS.md`.

Adjudicated (2026-08-20, by user):
- Port policy: current code is authoritative — `strictPort: false`, auto-increment allowed. The 18801–18899 range becomes advisory discipline rather than config-enforced. TASK-001 HIGH port finding is closed by this decision; TASK-001 is now COMPLETED (skeleton delivered, review finding adjudicated away).
- ADR-009 (VisualEffect contract) and ADR-010 (VisualSettings shape) are accepted and recorded in `.codex/DECISIONS.md` (2026-08-20, temporary write authorization granted by user for this entry only; authorization now closed). TASK-003 embeds the same rulings.

Blocked:
None.

---

## Status History

- TASK-001 — COMPLETED (2026-08-20: port-policy finding closed by user adjudication; skeleton was otherwise approved in review)
- TASK-002 — COMPLETED (review APPROVED, 2026-08-20, see reviews/TASK-002-review.md; 5 LOW/INFO notes, no required changes)
- TASK-003 — COMPLETED (review APPROVED, 2026-08-20, see reviews/TASK-003-review.md; 0 required changes, 4 INFO notes; runtime independently verified via headless Edge screenshots at virtual time 5 s and 6.5 s, orb visible and animating)
- TASK-004 — COMPLETED (review APPROVED, 2026-08-20, see reviews/TASK-004-review.md; 0 required changes, 3 INFO + 2 LOW notes; runtime independently verified via headless Edge screenshot — all four Inspector groups + 6 controls + selector availability + enabled Reset confirmed)

## Coordination Note (2026-08-20)

The architecture role (specifications, task definitions, reviews, and this status file) is now handled by WorkBuddy, succeeding Codex. Implementation remains Cursor's responsibility per the existing workflow in .cursor/README.md. All other .codex/ documents are frozen as historical knowledge and remain authoritative. WorkBuddy write scope: `.codex/STATUS.md`, `.codex/tasks/`, `.codex/reviews/`. Temporary one-shot write into `.codex/DECISIONS.md` was authorized on 2026-08-20 to record ADR-009 / ADR-010; that authorization is closed.

## Status Definitions

- PLANNED — Task specification exists and is waiting for implementation.
- IN_PROGRESS — Cursor is implementing the current Task.
- REVIEW — Cursor implementation is ready for architecture review (WorkBuddy).
- CHANGES_REQUIRED — Review found required changes.
- COMPLETED — Task passed review (or, for TASK-001, finding adjudicated by user).
