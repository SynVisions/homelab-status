---
number: NNNN
slug: short-hyphenated-slug
design_status: none            # none if this task skipped the design phase; otherwise accepted
implementation_status: draft   # draft → active (via /review-plan or /edit-plan) → completed
autonomous_eligible: false     # false → supervised mode; true → autonomous mode; see docs/bundles/README.md § Status for criteria
# derived_from_design: NNNN    # uncomment if this plan derives from a design in a different bundle
---

# NNNN — <Human-readable title>: implementation plan

> Delete this template's prose-style guidance once the real content lands.
>
> **This file is the plan overview, not the execution surface.** Per-task steps live in `tasks/task-NN-<slug>.md`. Live status lives in `task-status.md`. Per-task worklogs live in `worklogs/task-NN-<slug>.md`. `/exec-task` reads `task-status.md` first to pick a task, then loads only that task's file — keep this overview short so it isn't reloaded for every iteration.

## Scope of this task

One short paragraph: what this plan delivers, what it leaves out, and (if applicable) which `design.md` it implements. If this task skipped the design phase, the scope paragraph should state why a design wasn't warranted (e.g. "single-module refactor, one credible approach").

## Preconditions

- Bullet list of prerequisites that must be true before execution starts.
- Include any required secrets, host access, or upstream tasks.

## Structural notes

Cross-task decisions or shape choices that apply to more than one task — anything an executor should know before running any task in this plan. Per-task files reference these rather than restating them. Examples: a shared abstraction approach, a load-bearing module pin, a dispatch convention. Drop the section if there's nothing cross-cutting.

## Failure-handling contract

If the plan inherits a failure-handling policy from a parent design (e.g. "every mutating step carries a `Re-run:` tag"), capture it here once so per-task files don't repeat it. Drop the section if the plan has no special policy.

## Tasks

The task list, statuses, and pointers to per-task files live in [`task-status.md`](task-status.md). Each row links to `tasks/task-NN-<slug>.md`. Add or remove tasks via `/edit-plan`; never inline a task's steps here.

A bundle for this plan should expand to (numbers are illustrative):

```
tasks/
├── task-01-<slug>.md
├── task-02-<slug>.md
├── ...
└── task-NN-closeout.md
worklogs/
├── task-01-<slug>.md
├── task-02-<slug>.md
└── ...
```

The **closeout task** (last entry in `task-status.md`) carries the gates that flip `implementation_status: active → completed`: all earlier task rows marked `completed`, every bundle-scoped symlink under the project's runtime/config tree resolved, gitleaks clean over the bundle, `docs/bundles/INDEX.md` updated, and frontmatter flipped here. See `TEMPLATE/task.md` for the closeout-task shape.

## Worklog

Per-task worklogs live in `worklogs/task-NN-<slug>.md` (one file per task, mirroring the `tasks/` layout). The executing agent updates only the worklog for the task currently in flight. See the global `AGENTS.md` "Top Level Project Instructions" for what belongs in a worklog.
