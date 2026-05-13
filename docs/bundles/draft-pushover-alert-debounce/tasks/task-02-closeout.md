# Task 02 — Closeout

## Goal

Land Task 01's workflow edit on `master` (so GitHub Actions actually picks up the new file), verify it end-to-end with two live rehearsals, then flip the bundle to `completed` and tear down the worktree.

## Preamble

The deploy-before-rehearse order matters. GitHub Actions resolves `on: issues:` workflow-file versions from the **default branch only** (per [docs/actions/events-that-trigger-workflows § issues](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)). A version of `pushover-on-incident.yml` sitting on `bundle/0001-pushover-alert-debounce` does NOT fire for `issues.opened` / `issues.closed` — the workflow that fires is whatever is on `master` at issue-event time. So the rehearsals can only exercise the new dual-job workflow after `bundle-merge` has advanced `master` to include Task 01's commit.

The rehearsals are gated on the user being available to receive (or NOT receive) the test Pushover. If the user is asleep / unavailable, the executor must pause and surface the gate to the user before proceeding.

This task lives on `bundle/0001-pushover-alert-debounce` (renamed from `bundle/draft-pushover-alert-debounce` by plan-acceptance `bundle-merge`). The worktree path remains `.claude/worktrees/draft-pushover-alert-debounce` — `bundle-merge`'s rename mode intentionally does not move worktree paths.

## Steps

- [ ] **Step 1 — Confirm task 01 is `completed` in `../task-status.md`.**

      *Verification:* `grep '^| 01 ' ../task-status.md | grep -c completed` returns `1`.

- [ ] **Step 2 — Land Task 01 on `master` and push so the new workflow is actually live on GitHub.** GitHub Actions resolves `on: issues:` workflows from whatever is on `origin/master` (the default branch as GitHub sees it). Local `master` ahead of `origin/master` doesn't help — the rehearsals would still trigger the OLD workflow. So this is a two-step deploy: `bundle-merge` to advance local `master`, then `git push origin master` from the parent checkout to publish.

      ```bash
      # From inside the worktree:
      bundle-merge

      # From the parent checkout (~/Developer/homelab-status):
      git push origin master
      ```

      Direct mode is auto-detected because the branch is `bundle/0001-pushover-alert-debounce` (post plan-acceptance rename). The helper rebases onto `master` and atomically advances `refs/heads/master` to include Task 01's workflow commit. No flags — `--teardown` belongs in Step 8, not here. The push is plain `git push`; there is no `--push` flag on `bundle-merge`.

      *Verification:* `git rev-parse master` equals `git rev-parse HEAD` and equals `git rev-parse origin/master` after the push. `git log -1 origin/master --format=%s` shows Task 01's `feat: debounce pushover by 20 minutes via dual-job workflow` subject. `gh workflow view "Pushover on incident" --repo SynVisions/homelab-status --ref master --yaml | yq '.jobs | keys'` returns `[notify-down, notify-up]`. No "Invalid workflow file" annotation visible at https://github.com/SynVisions/homelab-status/actions.

- [ ] **Step 3 — Rehearsal A: early-close path (must NOT page; issue must be deleted).** Surface to the user that the rehearsal is about to start and they should keep an eye on Pushover for the next ~25 minutes (expecting nothing). Pick the close time deliberately to exercise the 15–20 min `CLOSED → delete` branch — close at T+17min, NOT T+5min, so we verify the `gh issue delete` path (not just Upptime's own 15-min auto-delete, which would moot the test). Then:

      ```bash
      gh issue create --repo SynVisions/homelab-status \
        --title "REHEARSAL: pushover-debounce — late close, expect delete" \
        --label status \
        --body "Synthetic issue for bundle pushover-alert-debounce task 02. Will be closed at T+17min. No Pushover expected; issue should be deleted by workflow at T+20min."
      ```

      Capture the issue number `<N>`. At T+17min, close the issue: `gh issue close <N> --repo SynVisions/homelab-status --comment "Rehearsal complete (mid-window close)."`. Wait until T+22min, then verify the issue was deleted by the workflow.

      *Verification:* `gh issue view <N> --repo SynVisions/homelab-status --json state -q .state 2>&1` returns a "not found" error (issue deleted). User confirms in chat: "no Pushover received". `gh run list --repo SynVisions/homelab-status --workflow "Pushover on incident" --limit 1 --json conclusion -q '.[].conclusion'` returns `success` (the `notify-down` job exited cleanly via the `CLOSED → delete` branch).

- [ ] **Step 4 — Rehearsal B: page-then-up path (MUST page twice).** Surface to the user that the rehearsal is about to start and they should expect a "DOWN" Pushover at T~20min and an "UP" Pushover shortly after the close. Then:

      ```bash
      gh issue create --repo SynVisions/homelab-status \
        --title "REHEARSAL: pushover-debounce — late close" \
        --label status \
        --body "Synthetic issue for bundle pushover-alert-debounce task 02. Will be closed after T+20min. Two Pushovers expected."
      ```

      Wait at least 21 minutes. Confirm the issue now carries the `pushover-sent` label and the user received the DOWN page. Then close the issue: `gh issue close <N> --repo SynVisions/homelab-status --comment "Rehearsal complete (late close)."`. Confirm the UP page fires within ~30 seconds.

      *Verification:* `gh issue view <N> --repo SynVisions/homelab-status --json labels -q '.labels[].name'` contains `pushover-sent`. User confirms two Pushovers received (one DOWN at T~20min, one UP shortly after close). `gh run list --repo SynVisions/homelab-status --workflow "Pushover on incident" --limit 2` shows two runs, both `success`.

- [ ] **Step 5 — Mandatory `advisor()` call.** Before flipping `implementation_status: completed`, invoke `advisor()`. The advisor sees the full conversation including both rehearsals' outcomes and probes for gaps the rehearsals didn't cover (e.g. concurrent multi-service outages, label-race edge cases, what happens if Upptime deletes the issue while we're sleeping). Paste a 1–3 sentence verdict summary into the worklog for this task, and copy that same summary verbatim into the body of the closeout commit message that `/exec-task` writes when this task completes (Step 7's frontmatter flip is the last edit before that commit).

      *Verification:* Advisor invocation occurred this turn; verdict summary pasted into the worklog for this task and visible in `git log -1 --format=%B HEAD` after the task-completion commit.

- [ ] **Step 6 — Bundle hygiene gates.** Run gitleaks over the bundle and confirm the docs/bundles INDEX row is present (the row was appended by plan-acceptance `bundle-merge`; this is a sanity check that nothing has overwritten it).

      *Verification:*
      ```
      gitleaks detect --source docs/bundles/0001-pushover-alert-debounce --no-banner
      gitleaks detect --log-opts=--all --source docs/bundles/0001-pushover-alert-debounce --no-banner
      ```
      Both exit 0. `grep -c '| 0001 | pushover-alert-debounce ' docs/bundles/INDEX.md` returns `1`.

- [ ] **Step 7 — Flip frontmatter and `task-status.md` rows.**

      ```
      ../implementation-plan.md frontmatter: implementation_status: active → completed
      ../task-status.md row 01: completed
      ../task-status.md row 02: completed (this row, last)
      ```

      *Verification:* `grep -E '^implementation_status:' ../implementation-plan.md` returns `implementation_status: completed`. `grep -E '^\| 0[12] ' ../task-status.md | grep -vc completed` returns `0`.

- [ ] **Step 8 — Land the closeout commit on `master` and tear down the worktree.** The Step 7 frontmatter flip lives as a new commit on `bundle/0001-pushover-alert-debounce` (written by `/exec-task`'s end-of-task commit, with the Step 5 advisor verdict in the body). Land it on `master` and remove the worktree + branch in one ceremony:

      ```bash
      bundle-merge --teardown
      ```

      Direct mode with `--teardown`. `bundle-merge` rebases the closeout commit onto `master`, advances `refs/heads/master` via CAS, `cd`s out of the worktree, runs `git worktree remove`, and deletes the bundle branch. Stdout is empty on success. The harness still thinks it's inside the (now-removed) worktree path; immediately call `ExitWorktree(action: "keep")` from the agent side to drop the harness back to the parent checkout cwd.

      *Verification, run from the parent checkout (`~/Developer/homelab-status`):* `git log --oneline master -1` shows the frontmatter-flip commit at HEAD. `git worktree list` no longer shows `draft-pushover-alert-debounce`. `git branch --list 'bundle/0001-pushover-alert-debounce'` is empty.

- [ ] **Step 9 — Push the closeout commit to `origin`.** Step 8's `bundle-merge --teardown` advanced local `master` again (with the frontmatter-flip commit) but did not push. From the parent checkout: `git push origin master`. Setup-CI only fires on pushes that touch `.upptimerc.yml` (allowlist; see `.github/workflows/setup.yml` `on.push.paths`), so a docs-bundles-only push is a no-op for the live status site.

      *Verification:* `git -C ~/Developer/homelab-status status -sb` shows `## master...origin/master` with no `[ahead]` count.

- [ ] **Step 10 — Clean up rehearsal issues.** Rehearsal A's issue should have self-deleted (via the workflow's CLOSED→delete branch); rehearsal B's issue likely still exists in closed state (it paged, then was closed; Upptime won't touch a manually-created issue). Confirm and clean up any survivors.

      ```bash
      gh issue list --repo SynVisions/homelab-status --state all --search "REHEARSAL: pushover-debounce" --json number,title,state
      # For each surviving issue: gh issue delete <N> --repo SynVisions/homelab-status --yes
      ```

      *Verification:* `gh issue list --repo SynVisions/homelab-status --state all --search "REHEARSAL: pushover-debounce" --json number -q 'length'` returns `0`.

## Deviations

_No deviations._
