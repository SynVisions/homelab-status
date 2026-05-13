# F\<N\> — \<one-line title\>

> Save as `tasks/F<N>-<slug>.md` inside the bundle, alongside planned `task-NN-*.md` files. Worklog at `worklogs/F<N>-<slug>.md`. Follow-ups inherit the bundle's plan and design context — keep this file slim; do not re-state context the originating work-task already carries.
>
> **Origin:** [task-NN D\<M\>](task-NN-<slug>.md#deviations) — see that row for status (always `workaround` while this follow-up is `pending`) and the matching worklog § Deviations narrative for full root-cause detail.

## What needs to happen

Two to four sentences. What the fix is, where it lands (file paths, line numbers if relevant), and what verification confirms it landed. The triage subagent's directive populates this section when the follow-up is scaffolded; the executor refines it as the fix is implemented.

## Steps

- [ ] **Step 1 — \<action\>** — concrete command or edit.

      *Verification:* `\<command or check\>` — expected outcome.

      *Re-run:* `idempotent` | `converges; reports changed=true` | `guarded`.

- [ ] **Step 2 — Update originating deviation row.** Edit `tasks/task-NN-<slug>.md` § Deviations row D\<M\>: change `Status` from `workaround` to `fixed`. Leave the `paired with F<N>` pointer in place — the F-id is the durable audit trail; no fix-commit sha needed.

- [ ] **Step 3 — Mark this follow-up `completed`.** Update the F\<N\> row in `../task-status.md` to `completed` in the same turn this file's last checkbox is ticked.

## Deviations

(Same shape and rules as the work-task template's § Deviations — a follow-up can itself spawn a deviation. Use D-numbers scoped to this follow-up file; cross-link to its own worklog.)

_No deviations._
