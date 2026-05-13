# NNNN — Task status

> Single source of truth for task-level state in this plan. `/exec-task` reads this file first to pick the next task to run, so keep it tiny and table-driven — no prose, no per-task frontmatter, no duplicated content from `tasks/task-NN-*.md`.
>
> **Status values:** `not_started | in_progress | blocked | completed`.
> **Pickup rule:** the executing agent picks the first row whose status is not `completed` (and is not `blocked` without explicit user direction). If multiple rows are `in_progress`, that's a state-sync bug — surface it to the user before continuing.
> **Real-time update rule:** when a task changes state, the agent updates that row in this file *in the same turn* it ticks the step checkboxes in the work-task or follow-up file. Both, not either.

This table holds **two row types**:

- **Planned work-tasks** — numbered `01..NN`, scaffolded by `/create-plan`. `Origin` is `planned`. File lives at `tasks/task-NN-<slug>.md`.
- **Follow-ups** — numbered `F1..FN`, scaffolded by `/exec-task` mid-execution after the `triage-deviation` subagent decided `workaround+followup`. `Origin` is a markdown link to the originating deviation row (e.g. `[task-10 D8](tasks/task-10-<slug>.md#deviations)`). File lives at `tasks/F<N>-<slug>.md`.

Both row types share the same status enum and pickup rule. Closeout's gate is "every row in this table is `completed`" — follow-ups can't slip past, since they sit in the same pickup queue as planned work-tasks.

| #   | Title                              | Origin                                                                              | Status      | File                                                  |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------- |
| 01  | <one-line title>                   | planned                                                                             | not_started | [task-01-<slug>.md](tasks/task-01-<slug>.md)          |
| 02  | <one-line title>                   | planned                                                                             | not_started | [task-02-<slug>.md](tasks/task-02-<slug>.md)          |
| ... | ...                                | ...                                                                                 | ...         | ...                                                   |
| NN  | Closeout                           | planned                                                                             | not_started | [task-NN-closeout.md](tasks/task-NN-closeout.md)      |
| F1  | <one-line follow-up title>         | [task-NN D\<M\>](tasks/task-NN-<slug>.md#deviations)                                | not_started | [F1-<slug>.md](tasks/F1-<slug>.md)                    |

(Delete the F1 example row above on bundle scaffold — follow-ups are added on demand by `/exec-task`, not pre-scaffolded.)

## Notes

Optional, brief, only if needed:

- Why a task is `blocked` (which open question or upstream gate).
- Pointer to the most recent in-flight worklog if a task was interrupted.

Do not log execution detail here — that belongs in `worklogs/task-NN-<slug>.md` or `worklogs/F<N>-<slug>.md`.
