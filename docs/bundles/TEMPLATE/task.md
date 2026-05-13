# Task NN — <Human-readable task title>

> Delete this template's prose-style guidance once the real content lands.
>
> **This file holds one task's executable steps and nothing else.** No frontmatter — task-level status lives in `../task-status.md`, the single source of truth. Cross-task decisions (failure-handling contract, dispatch shape, module pins) live in the plan-level `../implementation-plan.md` and are referenced from here, not restated.
>
> Save as `tasks/task-NN-<slug>.md` inside the bundle. The closeout task uses the same shape — see the "Closeout task" note at the bottom of this template.

## Goal

One or two sentences: what this task accomplishes and how it advances the plan. The goal should make verification self-evident — a future reader should be able to tell if this task succeeded just by reading this paragraph.

## Preamble (optional)

Anything specific to this task an executor should know before running steps — e.g. a load-bearing assumption, an order-of-operations note, or a pointer to a relevant section of `../implementation-plan.md`. Skip the section if there's nothing to add.

## Steps

Steps are checkboxes. Each step is one concrete action with a verification. Update checkboxes in real time during `/exec-task` — never batch ticks at the end.

- [ ] **Step 1 — <action>** — concrete command or edit.

      *Verification:* `<command or check>` — expected outcome.

      *Re-run:* `idempotent` | `converges; reports changed=true` | `guarded` (drop if the plan has no failure-handling contract).

- [ ] **Step 2 — <action>** — …

      *Verification:* …

## Deviations

> Structured audit trail of every divergence from the plan. The matching `../worklogs/task-NN-<slug>.md` carries the narrative (what happened, root cause, recovery commands); this table carries the *status* a reviewer or closeout sweep can grep.
>
> **Real-time update rule:** when a deviation occurs, add the row to this table in the same turn the narrative goes into the worklog. Never batch deviations to the end of the task.
>
> **Status values** (set by the `triage-deviation` subagent's verdict, recorded by the executor):
>
> - `fixed` — code change landed in this task's branch (the per-task commit; no separate sha needed in the pointer column — write `—`). Terminal happy state.
> - `workaround` — recovered out-of-band (MCP call, manual edit, one-shot script run) without a code fix. **Always paired with an `F<N>` follow-up row in `../task-status.md`**; the pointer column carries the F-id (e.g. `paired with F1`). The follow-up must reach `completed` in `../task-status.md` before bundle closeout flips.
> - `not-a-bug` — investigated and intentional. One-sentence rationale required in the worklog.
> - `open` — under active investigation in this task (executor briefing or triage in flight). Must move to a terminal state above before this work-task's row in `../task-status.md` flips to `completed`.

(Note: the `triage-deviation` subagent may also return a `graduate-to-new-bundle` verdict for surprises that exceed bundle scope. That verdict stops execution and surfaces to the user — the executor never graduates autonomously. While the user decides, the row stays `open`.)

| #   | Title                                            | Status     | Follow-up      |
| --- | ------------------------------------------------ | ---------- | -------------- |
| D1  | <one-line title; full narrative in worklog>      | fixed      | —              |
| D2  | <one-line title>                                 | workaround | paired with F1 |
| D3  | <one-line title>                                 | not-a-bug  | —              |

(Delete the example rows above once real entries land. Keep the table even if there are zero deviations — write `_No deviations._` under the header instead.)

---

> **Closeout task shape.** The last task in every plan implements the bundle's closeout — the gates that flip `implementation_status: active → completed`. Its steps:
>
> - [ ] Every row in `../task-status.md` (planned work-tasks **and** follow-ups) is `completed`. Concrete check: `grep -E '^\| (0[0-9]|[1-9][0-9]|F[0-9]+) ' ../task-status.md | grep -vE '\|\s*completed\s*\|'` returns no rows.
> - [ ] **Deviation sweep.** For every `tasks/*.md` (work-task and follow-up) in this bundle, the `## Deviations` table contains zero `open` rows and zero `workaround` rows lacking an `F<N>` pointer that is itself `completed` in `../task-status.md`. Concrete grep: `grep -hEA200 '^## Deviations' tasks/*.md | grep -E '^\|\s*D[0-9]+\s*\|.*\|\s*(open|workaround)\s*\|'` returns only `workaround` rows whose paired F-id row in `../task-status.md` is `completed`. Read each surviving `workaround` row by hand to confirm the pairing.
> - [ ] **Mandatory `advisor()` call.** Before flipping `implementation_status: completed`, invoke the advisor and embed its verdict in the closeout commit message. The advisor sees the full conversation (every deviation, every triage outcome, every follow-up's resolution) and probes for strategic gaps the grep can't catch (e.g. success criteria not actually met, deviations that taken together amount to scope failure).
> - [ ] Every bundle-scoped symlink under the project's runtime/config tree pointing into this bundle is resolved (removed if temporary; underlying file `git mv`'d to its permanent location if it must persist).
> - [ ] `gitleaks` is clean over the bundle: `gitleaks detect --source docs/bundles/<NNNN-slug> --no-banner` and `gitleaks detect --log-opts=--all --source docs/bundles/<NNNN-slug> --no-banner`.
> - [ ] Local `main` advanced via `bundle-merge --teardown` (run from inside the worktree); the helper rebases, atomically advances `main` via `git update-ref` CAS, and tears down the worktree and branch under the same flock. Do not push `origin main` from the closeout — the user pushes whenever they want, separately.
> - [ ] `ExitWorktree` called to re-anchor the harness session out of the now-deleted worktree path. (`bundle-merge --teardown` already removed the worktree and deleted the branch.)
> - [ ] `docs/bundles/INDEX.md` row reflects the new status.
> - [ ] `implementation_status: active → completed` flipped in `../implementation-plan.md` frontmatter.
> - [ ] Final closeout row in `../task-status.md` set to `completed`.
