# Bundles

Each bundle is a self-contained directory: `docs/bundles/<NNNN-slug>/`. A bundle captures one unit of work end to end — optionally beginning with a high-level **design** that gets agreement with the user, then proceeding to an **implementation plan** that the agent executes step by step.

Most bundles contain only an `implementation-plan.md`. Complex bundles add a `design.md` first. The skills that draft, review, and execute these bundles ship as the **`sdlc` Claude Code plugin** (`SynVisions/synvisions-agentic-sdlc`); invoke them via the prefixed slash form (`/sdlc:create-design`, `/sdlc:create-plan`, `/sdlc:review-plan`, `/sdlc:exec-task`, `/sdlc:exec-bundle`, etc.).

## Layout of a bundle

New plans use the **split layout** (one task per file). Older bundles still use the **monolithic layout** (all tasks inside `implementation-plan.md`). Both shapes coexist; tooling detects format by the presence of a `tasks/` subdirectory. Do **not** retroactively migrate older bundles — split-format only applies to plans drafted after this change.

### Split layout (current — what `/create-plan` produces)

```
docs/bundles/<NNNN-slug>/
├── design.md                    (optional — high-level: problem, options, recommendation)
├── design-open-questions.md     (optional — design-phase questions; required while design_status=draft has unresolved Qs)
├── implementation-plan.md       (mandatory once planning starts — slim overview + frontmatter; NO per-task steps)
├── plan-open-questions.md       (optional — planning-phase questions; required while implementation_status=draft has unresolved Qs)
├── task-status.md               (mandatory once planning starts — single source of truth for per-task state)
├── tasks/
│   ├── task-01-<slug>.md        (per-task: goal, steps, verifications)
│   ├── task-02-<slug>.md
│   ├── ...
│   └── task-NN-closeout.md      (last task — gates the active → completed flip)
├── worklogs/
│   ├── task-01-<slug>.md        (per-task execution log)
│   └── ...
├── scripts/                     (optional — bundle-scoped shell/Python helpers)
├── snapshots/                   (optional — point-in-time text/data captures)
├── audit/                       (optional — security/compliance scan output, recommendations, etc.)
└── perf-baseline/               (optional — benchmark inputs and results)
```

The split exists to keep `/exec-task`'s context window small: an executor reads `task-status.md` (small) to pick a task, then loads only the one `tasks/task-NN-<slug>.md` file plus its corresponding `worklogs/task-NN-<slug>.md`. The plan-level `implementation-plan.md` is loaded once for cross-task context (scope, structural notes, failure-handling contract) and not reloaded each iteration.

### Monolithic layout (legacy — pre-split bundles)

```
docs/bundles/<NNNN-slug>/
├── design.md                    (optional)
├── design-open-questions.md     (optional)
├── implementation-plan.md       (all tasks inline as ## Task N sections with step checkboxes)
├── plan-open-questions.md       (optional)
├── worklog.md                   (single file) or worklogs/<task-or-date>.md
├── scripts/                     (optional)
└── ...
```

Older bundles (everything in the index table prior to this layout change) keep this shape. Tools that touch a bundle should branch on `tasks/` existence: present → split layout; absent → monolithic.

### Templates

The plugin ships templates for both layouts under `plugins/sdlc/templates/`; the drafting skills copy them into new bundles automatically:

- `design.md` — design document (unchanged, both layouts)
- `open-questions.md` — reused for `design-open-questions.md` and `plan-open-questions.md` (the `<phase>` placeholder is filled in at copy time)
- `implementation-plan.md` — slim overview, split layout
- `task-status.md` — task-level status table, split layout
- `task.md` — one per-task file (also covers the closeout-task shape)
- `followup.md` — one per-follow-up file (slim shape; in-bundle, scaffolded by `/exec-task` mid-execution from a `triage-deviation` subagent verdict)
- `worklog.md` — one per-task worklog (used for both planned work-tasks and follow-ups)

## Numbering

- Sequential, 4-digit, never reused: `0001`, `0002`, …
- Numbers are assigned at bundle creation and never re-dated. The slug after the number is hyphenated lowercase.
- A bundle gets its number when it is created, regardless of whether it starts with a `design.md` or jumps straight to an `implementation-plan.md`.
- Choose the next available number by listing this directory.

## Canonical bundle flow

The skills shipped by the sdlc plugin are designed to compose. The full happy-path flow for a complex umbrella bundle looks like:

```
/create-design
  ↓ (drafts design.md + design-open-questions.md, status: draft)
/review-design                         ← optional but recommended
  ↓ (processes user feedback, resolves questions, flips status: accepted)
[umbrella case: spawn N child bundles]
  ↓
for each child bundle:
    /create-plan
      ↓ (drafts implementation-plan.md + plan-open-questions.md, status: draft)
    /review-plan                       ← optional but recommended
      ↓ (processes user feedback, resolves questions, flips status: active)
    /exec-task                         ← repeat per Task in the plan
      ↓ (ticks checkboxes, commits per Task)
    closeout (status: completed)
```

### Parallel-agent-safe flow

**Closeout** for every bundle — `/exec-task`-driven and `/exec-bundle`-driven alike — runs `bundle-merge --teardown` from inside the worktree. The helper acquires a workstation-local flock on the primary `.git/bundle-merge.lock`, rebases the branch onto local `main`, atomically advances `main` via `git update-ref` compare-and-swap, removes the worktree, and deletes the branch — all under the same lock. The orchestrator (or the user, for `/exec-task`) then calls `ExitWorktree` to re-anchor the session, and the run summary prints. The operator never runs `git checkout main && git merge --ff-only && git push origin main` manually; `bundle-merge` does not push to `origin`, so push cadence is the user's call.

**Drafting and acceptance** also run through `bundle-merge`:

- **Drafting** happens in `bundle/draft-<slug>` worktrees at `.claude/worktrees/draft-<slug>/`. The bundle directory is `docs/bundles/draft-<slug>/` and the frontmatter omits `number:` until first acceptance. `/create-design` and `/create-plan` create the `draft-<slug>` worktree and directory automatically.
- **First acceptance** (design or plan flipping from `draft` to `accepted` / `active`) calls `bundle-merge` in **rename mode**: allocates the next free `NNNN`, renames the bundle directory (`draft-<slug>` → `NNNN-<slug>`) and the branch (`bundle/draft-<slug>` → `bundle/NNNN-<slug>`), and lands the accepted file on `main`. Subsequent acceptances (e.g., plan after design) run `bundle-merge` in **direct mode** (no rename — bundle is already numbered).
- **Umbrella designs** accept via `bundle-merge --umbrella <child-slug-1> <child-slug-2> ... --teardown`. The helper atomically allocates the parent number plus N consecutive child numbers, writes child stub directories under `docs/bundles/`, and rewrites all `[child-slug]` references in the parent design body to `NNNN-<child-slug>`.

An eligible bundle (frontmatter `autonomous_eligible: true`, see § Status →
`autonomous_eligible` for the criteria) can be driven end-to-end by `/exec-bundle <NNNN>`
instead of running `/exec-task` per task. The orchestrator spawns per-task executors,
routes deviations through `triage-deviation` without nesting, runs the mandatory
`advisor()` call inline, fast-forward merges to `main`, and tears down the worktree.
Two entry points: invoke `/sdlc:exec-bundle <NNNN>` from inside Claude Code, or run
the plugin-shipped `exec-bundle <NNNN>` shim (or `claude-schedule "<time>" --worktree
<NNNN> -- --model opus --effort xhigh "/sdlc:exec-bundle <NNNN>"` for scheduled runs)
from a shell. The `--worktree <NNNN>` flag tells `claude-schedule` to call
`wt-prepare` at fire time so the spawned `claude` session runs with cwd inside
`.claude/worktrees/<NNNN-slug>`, which the orchestrator's pre-flight requires.
`/sdlc:exec-bundle` enforces a per-task watchdog (`--task-timeout`, `--no-progress-window`; defaults `25m` / `12m`) that terminates a runaway executor cleanly. See the `exec-bundle` skill in the plugin for the full flag reference.

`/create-plan` may pause partway through drafting if it proposes a task list with N > 6 tasks (the hard sizing gate). At that point the user picks one of two paths: confirm-and-proceed (the awkward, supported path) or split-via-umbrella (the default — re-invoke `/create-design` with an umbrella shape that spawns two or more child bundles). See § "What makes a good implementation plan" → `### Bundle sizing` for the rubric drafters use *before* the gate fires.

For a simple single-bundle case, skip the design phase: `/create-plan` → `/review-plan` (optional) → `/exec-task`.

**The review steps are optional.** If the user wants to skip a detailed review pass for a low-stakes design or plan, they can flip status directly via `/edit-design` or `/edit-plan` (e.g. "accept this design without a review"). The acceptance gate (open questions all `RESOLVED` + user sign-off) still applies — it just lives in the edit skill instead of the review skill. Use the review path when you want adversarial probing; use the edit path when you've already mentally reviewed and just want to advance the lifecycle.

`/create-*` skills never flip status themselves. They draft, surface a recommendation, write a stub `*-open-questions.md` for the user to fill in, and stop. Acceptance is always a separate explicit step (review or edit), so the user is never surprised by an auto-accept.

## When does a bundle need a design phase?

**Default to skipping `design.md`.** Add it (and pause for user agreement before drafting the implementation plan) only when **one or more** of the following apply:

- **Multiple plausible architectures.** There is more than one credible way to satisfy the requirement and the choice has consequences.
- **Cross-cutting impact.** The change spans multiple components, services, or layers of the system.
- **Spawns more than one implementation plan.** The work will eventually break into multiple sub-bundles (umbrella case).
- **Hard-to-reverse choices.** Data migration, irreversible topology changes, vendor or technology lock-in.

If none apply, a short "scope of this bundle" paragraph at the top of `implementation-plan.md` is sufficient context — no separate design needed.

## What makes a good design

A `design.md` articulates the proposed architecture for a complex bundle and reaches user agreement on it. It is not an option-selection memo, and it is not an execution document.

**The body of the document is `## Design`.** That is where the architecture, lifecycle, failure modes, and end-to-end walkthroughs live. Everything before § Design frames what's being designed; everything after defends the chosen shape briefly. If the bulk of the document's word count is in `## Alternatives considered`, the design has not been written — it has been deferred.

- **Problem statement** — what we're trying to solve and why now. Concrete enough that the success criteria are obvious.
- **Goals and non-goals** — explicit in/out of scope. Non-goals are as important as goals.
- **Current state** — relevant snapshot of how things work today (only what the reader needs to understand the gap the design closes).
- **Design** — *the body of the document.* Architecture (named components and their responsibilities), lifecycle / data flow (how state moves through the system), failure modes & recovery (concrete failures and concrete responses), migration path (if applicable), and at least one end-to-end walkthrough of a realistic scenario. The user MUST be able to read this section alone and understand exactly what will be built — without cross-referencing `design-open-questions.md`. An implementation-plan drafter should be able to draft from this section without re-reading the alternatives appendix.
- **Why this design** — short prose (a few paragraphs) defending the chosen shape. Lead with the property of the problem that makes this shape fit. Reference § Goals where you make a tradeoff. Don't refight alternatives here.
- **Alternatives considered** — *appendix.* One paragraph per alternative: name, sketch, one-line reason it lost. The point is the audit trail, not exhaustive comparison. If a design genuinely has no alternative worth recording, a single sentence saying so is fine. Strawmanning alternatives to look thorough is worse than omitting the section.
- **Implementation plans this design will spawn** — name(s) and scope(s) of the `implementation-plan.md` files that will derive from this design. Single-bundle case: one plan in this same directory. Umbrella case: enumerate the new bundle numbers/slugs that will be created, each with its own bundle linking back via `derived_from_design`.
- **Bundle sizing surface (umbrella designs)** — if a design will spawn a single plan implying > 6 tasks, or an umbrella with N children where one child clearly carries > 6 tasks, surface that during design review. The hard sizing gate lives downstream in `/create-plan`; design phase is the cheapest place to notice and split. See § "What makes a good implementation plan" → `### Bundle sizing` for the rubric.

`design-open-questions.md` is for tradeoffs the **user** has to decide — not for architectural choices the agent should be making. If a load-bearing decision lives in a Q, it's unresolved architecture; the agent's job is to fold the recommendation into § Design and only leave the user-facing tradeoff in the question.

A design becomes `accepted` only when the user has agreed to the design **and** every entry in `design-open-questions.md` is `RESOLVED`. After that, design edits require an explicit user check-in; new detail accumulates in the implementation plan(s) instead.

## Deviations, triage, and follow-ups

When task execution diverges from the plan (a bug surfaces, a step skipped, a verification surprise, an out-of-band recovery), three things happen in sequence:

1. **The executor investigates enough to brief.** Just enough to identify root cause, name the affected file/code paths, and (if it took a recovery action) describe what it ran. The executor does not classify the deviation itself — that's the next step.
2. **The executor invokes the `triage-deviation` subagent.** Invocation is via the Agent tool (`Agent(subagent_type: "triage-deviation", ...)`), never as a slash command — slash-invoking it would inject the triage instructions into the executor's own conversation and stall execution. The subagent runs on a strong model (Opus 4.7, xhigh effort) in fresh isolated context, reads the bundle's plan and remaining work-tasks on its own, and returns a verdict: `fix-in-flight`, `workaround+followup`, or `graduate-to-new-bundle`. See the `triage-deviation` agent in the plugin.
3. **The executor records the verdict.** Two places, two shapes:
   - **`tasks/task-NN-<slug>.md` § Deviations** — structured table row, one per deviation, with `Status` (set from the triage verdict: `fixed | workaround | not-a-bug | open`) and a `Follow-up` pointer (`paired with F<N>` for `workaround` rows; `—` otherwise — `fixed` rides the per-task commit). Audit trail a reviewer or closeout sweep can grep.
   - **`worklogs/task-NN-<slug>.md` § Deviations** — narrative prose under `### D<M> — <title>` headings: what happened, root cause, commands run, triage decision, action taken. The version a future operator reads to learn what *actually* happened.

The two are cross-linked by D-number. Real-time update rule: when a deviation occurs, both the table row and the narrative section land in the same turn — never batch.

## Open questions and the iteration loop

Open questions are tracked in a phase-specific file inside the bundle:

- **Design-phase questions:** `design-open-questions.md`, alongside `design.md`.
- **Planning-phase questions:** `plan-open-questions.md`, alongside `implementation-plan.md`. Umbrella children carry their own `plan-open-questions.md` in their own bundle, separate from the parent design's questions.

Each question carries a recommendation, a `### User Feedback` stub the user fills in, a `**Resolution:**` block the agent writes once the user has weighed in, and a `STATUS: OPEN | RESOLVED` marker. The drafting agent never types into `User Feedback`; the user does. The processing agent (typically `/review-design`, `/review-plan`, or just the next conversation turn) treats filled-in feedback as input, writes the resolution, flips the status, and folds the answer into the design or plan body so a future reader doesn't need to cross-reference.

**Interactive-first.** Drafting and review skills call `AskUserQuestion` in the same turn they write a question to the file, batching up to 4 questions per call. The recommendation appears as option 1 ("Recommended"), 1–2 alternatives drawn from the `**Why this and not the alternative(s):**` line follow, plus a "Defer to file" option for users who want to handle the question asynchronously in their editor; the auto-added "Other" lets the user reply with free-form prose. The file write is not optional — it is the durable audit trail. When the user answers in chat, the agent copies the chat decision into `### User Feedback` and writes the `**Resolution:**` block in the same turn. See the plugin's `open-questions.md` template for the canonical shape.

## What makes a good implementation plan

These are designed to be executed by AI agents. Good implementation plans are verbose and specific so the agent can complete them with high confidence. They have a clear set of execution steps and the minimal amount of runtime decisions required. They do **not** contain "rejected options" or brainstorming — that material belongs in `design.md` (if there is one) or is left out entirely. Bundle size matters as much as plan quality — see `### Bundle sizing` below before drafting the task list.

The most important thing to do in order to get to a good plan is to resolve all open questions with the user before plan execution. Where possible, provide a recommended answer rather than putting all the work on the user. If you can answer the question yourself by reading the code, using a skill, or invoking an MCP — do so.

Good plans have minimal to no human interaction required. When adding a step that requires human interaction, first consider whether it can reasonably be automated.

### Bundle sizing

Bundles work best at **≤ 6 tasks (excluding closeout)**. The sdlc plugin's skill suite is calibrated for that scale: drafting and review skills hold the whole bundle in a single context window, and large bundles produce visible context rot — reviewers miss the big picture, plans need many iteration cycles before they're executable, and tangents accumulate.

`/create-plan` carries a **hard sizing gate at N > 6** that pauses drafting and forces an explicit choice between confirm-and-proceed and split-via-umbrella. Treat the gate as the backstop, not the primary signal — the rubric below is what you reach for *before* drafting begins:

- **Target N ≤ 6 tasks (plus closeout) for a single bundle.** Closeout is always its own task and is not counted against the budget.
- **Prefer an awkward split over a single 8+ task bundle.** Splitting cost (cross-bundle coordination, sequencing, status-table duplication) is real but smaller than the cost of large-bundle context rot. If the only way to keep all related work in one bundle is to draft 10 tasks, split it.
- **Use umbrella designs for genuinely cross-cutting work.** When the work resists a clean split because it shares a single design decision, draft `design.md` first and have it spawn two or more child bundles via `derived_from_design`. Each child stays small; the umbrella design carries the shared context. See § "What makes a good design" for umbrella mechanics.
- **Don't pad to hit the cap.** The target is ≤ 6, not ≈ 6. A 3-task bundle is fine. A bundle that genuinely fits in two tasks should be two tasks.
- **The gate is non-negotiable, but the value isn't.** N = 6 is the current threshold; it may be retuned in the `create-plan` skill after a few real bundles. The rubric language in this section is pinned to the same literal — retune both together.

### Splitting work into tasks (split layout)

In split-layout plans, choosing the right task boundaries is what makes the per-file split actually pay off in token cost. Aim for:

- **One coherent unit of work per task** — a single integration, one module, one migration leg, one validation gate. A task should be runnable end-to-end without needing to read its siblings; cross-task context belongs in the plan-level `implementation-plan.md`.
- **Each task fits comfortably in an executor's context window** — roughly under ~300 lines of step content. If a task is ballooning, split it; if a task is one trivial step, fold it into a neighbour.
- **Tasks are committed independently.** `/exec-task` commits per task; if two units of work can't be cleanly committed apart, they're one task.
- **Closeout is its own final task.** The closeout gates (secret scan, symlink resolution, README update, frontmatter flip) live in `tasks/task-NN-closeout.md` and run via `/exec-task` like any other task.
- **Cross-task notes live in the plan, not the tasks.** Failure-handling contracts, dispatch shapes, load-bearing module pins go in `implementation-plan.md` § "Structural notes" or § "Failure-handling contract" once. Per-task files reference them.
- **Status is single-sourced.** `task-status.md` is the only place task-level status is recorded; per-task files have no `status:` frontmatter, so there is nothing to drift.

## Status

Status lives in YAML frontmatter at the top of `implementation-plan.md` (or at the top of `design.md` while no implementation plan exists yet). Two independent fields track the design and implementation phases:

```yaml
---
number: 0001
slug: example-bundle
design_status: none      # one of: none | draft | accepted | superseded
implementation_status: active   # one of: none | draft | active | umbrella | completed | archived
---
```

### `design_status`

- `none` — bundle did not warrant a design phase (most bundles).
- `draft` — `design.md` exists, not yet user-agreed. Set by `/create-design`. Cannot advance to `accepted` while any entry in `design-open-questions.md` is `OPEN`.
- `accepted` — user has signed off on the design and every open question is `RESOLVED`. Set by `/review-design` after user sign-off (or by `/edit-design` if the user explicitly skips the review step). Implementation plan(s) may now be written.
- `superseded` — a later design replaces this one; record the successor in the design body.

### `implementation_status`

- `none` — design accepted but no `implementation-plan.md` exists yet, and one is still expected. Use `umbrella` instead for parent designs that intentionally never get their own plan.
- `draft` — `implementation-plan.md` exists, not yet user-agreed. Set by `/create-plan`. Cannot advance to `active` while any entry in `plan-open-questions.md` is `OPEN`. `/exec-task` refuses to run a `draft` plan — accept it first.
- `active` — work is ongoing. Set by `/review-plan` after user sign-off (or by `/edit-plan` if the user explicitly skips the review step).
- `umbrella` — terminal state for an accepted **umbrella design** that spawns child bundles in *other* numbered directories and will never have its own `implementation-plan.md`. Set by `/review-design` or `/edit-design` at the moment the umbrella's `bundle-merge --umbrella ...` call lands (i.e. simultaneously with `design_status: draft → accepted`). Distinguishes "intentionally done — work lives in the children" from `none` ("plan still owed") at scan-time. Once children are spawned, the umbrella itself is not edited or executed; index it like a `completed` bundle for triage purposes.
- `completed` — set by the closeout task once its gates pass: every earlier task in `task-status.md` is `completed` (split layout) or every checkbox in `implementation-plan.md` is checked (monolithic), every bundle-scoped symlink pointing into the bundle is resolved (removed if temporary; underlying file `git mv`'d to its permanent location if it must persist), and the project's secret-redaction tool reports clean over the bundle (see "Secrets in bundles" below).
- `archived` — historical or superseded; will not run again.

### `autonomous_eligible`

Gates whether `/exec-bundle` may run this bundle without per-task user supervision. Default is `false`; setting it to `true` is an opt-in act that must be justified at drafting time and validated at acceptance time. The field is set deliberately during `/create-plan` drafting, carried through by `/edit-plan` (flips in either direction require explicit user confirmation), and validated by `/review-plan` before the plan advances to `active`.

A bundle is **disqualified** from autonomous execution if any of the following apply:

- **Touches live infrastructure or shared systems:** any task runs a deployment-apply command in non-dry-run mode (e.g., `npm publish` without `--dry-run`, `flyctl deploy`, `prisma migrate deploy` against production), issues an MCP write call (any write tool exposed by your project's MCPs), or pushes to a release branch. **Disqualifies; `autonomous_eligible` must remain `false`.**
- **Requires strategic reasoning per task:** tasks that involve weighing trade-offs between options, deciding migration ordering against live state, or making architecture choices that Sonnet-level mechanical execution cannot make reliably. **Disqualifies; `autonomous_eligible` must remain `false`.**
- **Has unresolved external dependencies at execution time:** tasks where a step's correctness depends on out-of-band human coordination (vendor support ticket, hardware swap, cross-team scheduling). **Disqualifies; `autonomous_eligible` must remain `false`.**

Bundles that pass all three checks are eligible. Eligibility is a deliberate judgment made at drafting (`/create-plan`) and ratified at acceptance (`/review-plan`). It is not a heuristic scan; it is a decision the strong-model drafter / reviewer makes once, with their reasoning recorded in the "Scope of this bundle" paragraph of `implementation-plan.md`.

### `derived_from_design`

When an implementation plan derives from a design that lives in a *different* bundle (umbrella case), the implementation plan adds a third frontmatter field pointing back at the design's bundle number:

```yaml
derived_from_design: 0017
```

This field is also surfaced in the index table's `derived_from` column (see § Index) so an at-a-glance read of the table makes umbrella relationships visible — the child's own `design_status` typically reads `accepted` (inherited from the parent per the `/create-plan` umbrella-child convention), and the `derived_from` column points the reader at the bundle whose `design.md` is the actual source. Stub child bundles created by `bundle-merge --umbrella` carry the column entry from the moment the parent design is accepted, even before their own `implementation-plan.md` is drafted; for those, `design_status` reads `none` until the child's `/create-plan` writes the inherited value into frontmatter.

Status changes only update the frontmatter; **never move the directory between status tiers**. This keeps numbering stable and avoids breaking inbound links.

## Persistent vs. bundle-scoped files

- **Persistent project artifacts** (things the project should durably keep): live in their natural location within the repo.
- **Bundle-scoped artifact that should be deployed *while the bundle is active***: lives in the bundle (`docs/bundles/<NNNN-slug>/scripts/`, `docs/bundles/<NNNN-slug>/configs/`, etc.) and is exposed to the broader project via a symlink from its natural location into the bundle. For example, a helper script shipped from `docs/bundles/<NNNN-slug>/scripts/<name>.sh` is symlinked from wherever the project expects to find it.

When the bundle closes (`implementation_status: completed` or `archived`), remove the symlink. If the artifact is now meant to persist, `git mv` the underlying file out of the bundle into its permanent location instead of leaving the symlink.

### Secrets in bundles

- Bundles must not commit plaintext secrets in any bundle file.
- This project doesn't have an encrypted-secrets pattern wired into bundles. If a bundle needs runtime secrets, surface them via the project's existing secret store (env vars, secret manager, etc.) rather than committing encrypted blobs to the bundle.
- Inventory tables in worklogs record variable **names** and source paths only — never values.
- A bundle moving to `implementation_status: completed` requires the project's secret-redaction tool to report clean over the bundle's contents, in both working-tree and full-history (`--git`) scopes. The pre-commit hook handles the staged-file case on every commit; the closeout requires the unscoped working-tree and full-history runs to verify nothing slipped past.
- A bundle-scoped script that the broader project sources via an env-file or runtime config cannot move to `completed` until either (a) the project-side reference is removed and the symlink under the persistent tree is `git rm`'d, or (b) the script graduates into its permanent location.

## Index

The bundle index lives in [`INDEX.md`](INDEX.md). `bundle-merge` appends a row to it at first-acceptance and umbrella-acceptance.
