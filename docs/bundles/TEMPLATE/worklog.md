# Task NN — Worklog

> One worklog file per task. Save as `worklogs/task-NN-<slug>.md`, mirroring the `tasks/task-NN-<slug>.md` filename. The executing agent updates only the worklog for the task currently in flight.
>
> Per the global `AGENTS.md` "Top Level Project Instructions": record commands and output (within reason — don't transcribe 20 minutes of line-by-line stream), and pay special attention to deviations from the plan and major problems encountered. The reader of this file is a future agent or reviewer trying to understand what *actually* happened versus what the plan said.

## Step 1 — <step title from `tasks/task-NN-<slug>.md`>

`<command run>` (YYYY-MM-DD):

```
<output, redacted as necessary — never paste secret values; record variable names + paths only>
```

Notes / verification result.

## Step 2 — <step title>

…

## Deviations

Two-file split: this file carries the **narrative** (what happened, root cause, commands run, recovery taken). The matching `tasks/task-NN-<slug>.md` § Deviations carries the **status** (fixed / workaround / deferred / not-a-bug / open) and a follow-up pointer (`paired with F<N>` for workarounds; `—` otherwise — fix-in-flight rides the per-task commit, no sha to chase). Cross-link by D-number — e.g. write a `### D1 — <title>` heading here and reference `D1` in the task-file row.

Real-time update rule: add the D-row to the task file *and* the matching narrative section here in the same turn the deviation occurs. Never batch deviations to the end of the task.

Recovery via MCP, manual edit, or other out-of-band action is `workaround` status, not `fixed`. A `workaround` deviation must be paired with a `deferred` row that points at a follow-up bundle (`docs/bundles/<NNNN-<slug>>/`) before the task can flip to `completed`. See `docs/bundles/TEMPLATE/task.md` § Deviations for the full status enum.

### D1 — <one-line title>

(Narrative: what happened, root cause, commands run, recovery taken. Full detail goes here so the task-file table can stay one row.)

## Verification summary

A short final paragraph or bullet list: what was verified, how, and the result. This is what closes the task — a green check without a verification record is not "done".
