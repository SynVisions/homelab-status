# Task 02 — Closeout

## Goal

Verify the new workflow exercises end-to-end with a manually-fabricated open/close cycle, then flip the bundle to `completed` and merge to `master`.

## Preamble

The closeout includes a live rehearsal against the actual `pushover-on-incident.yml` running in GitHub Actions. The rehearsal involves opening a synthetic test issue with the `status` label, observing the debounce wait, then closing the issue before T+20min — confirming that no Pushover fires on the early-close path. A second rehearsal (open, wait past T+20min, then close) confirms the page-then-up path.

Both rehearsals are gated on the user being available to receive (or NOT receive) the test Pushover. If the user is asleep / unavailable, the executor must pause and surface the gate to the user before proceeding.

## Steps

- [ ] **Step 1 — Confirm task 01 is `completed` in `../task-status.md`.**

      *Verification:* `grep '^| 01 ' ../task-status.md | grep -c completed` returns `1`.

- [ ] **Step 2 — Push the worktree branch and confirm the workflow parses.** Push `bundle/draft-pushover-alert-debounce` to `origin`. Open the Actions tab on GitHub and confirm the "Pushover on incident" workflow shows two jobs (`notify-down`, `notify-up`) under the latest revision; a YAML syntax error would surface here as a red "Invalid workflow file" banner.

      *Verification:* `gh workflow list --repo SynVisions/homelab-status --json name,state -q '.[] | select(.name=="Pushover on incident") | .state'` returns `active`. No "Invalid workflow file" annotation against the branch.

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

- [ ] **Step 6 — Bundle hygiene gates.** Run gitleaks over the bundle and confirm the docs/bundles INDEX is current.

      *Verification:*
      ```
      gitleaks detect --source docs/bundles/draft-pushover-alert-debounce --no-banner
      gitleaks detect --log-opts=--all --source docs/bundles/draft-pushover-alert-debounce --no-banner
      ```
      Both exit 0. `grep -c pushover-alert-debounce docs/bundles/INDEX.md` returns ≥ 1 (or note that the row is added at bundle-merge time by the SDLC tooling).

- [ ] **Step 7 — Flip frontmatter and `task-status.md` rows.**

      ```
      ../implementation-plan.md frontmatter: implementation_status: active → completed
      ../task-status.md row 01: completed
      ../task-status.md row 02: completed (this row, last)
      ```

      *Verification:* `grep -E '^implementation_status:' ../implementation-plan.md` returns `implementation_status: completed`. `grep -E '^\| 0[12] ' ../task-status.md | grep -vc completed` returns `0`.

- [ ] **Step 8 — Merge to master.** This repo uses `master` as the main branch, not `main`, so the SDLC plugin's `bundle-merge` helper (which hardcodes `refs/heads/main`) cannot be used. Do the merge manually. `git checkout master` inside the worktree would fail (the parent checkout already has `master` checked out, and git refuses concurrent checkouts of the same branch across worktrees), so the sequence is:

      ```bash
      # From inside the worktree:
      ExitWorktree                       # via the harness tool, NOT a shell command

      # From the parent checkout (now the active cwd after ExitWorktree):
      git pull --ff-only origin master
      git merge --ff-only bundle/draft-pushover-alert-debounce
      git push origin master
      git worktree remove .claude/worktrees/draft-pushover-alert-debounce
      git branch -D bundle/draft-pushover-alert-debounce
      ```

      *Verification:* `git log --oneline master -1` shows the workflow-debounce commit at HEAD. `git worktree list` no longer shows `draft-pushover-alert-debounce`. `git branch --list 'bundle/draft-pushover-alert-debounce'` is empty.

- [ ] **Step 9 — Clean up rehearsal issues.** Rehearsal A's issue should have self-deleted (via the workflow's CLOSED→delete branch); rehearsal B's issue likely still exists in closed state (it paged, then was closed; Upptime won't touch a manually-created issue). Confirm and clean up any survivors.

      ```bash
      gh issue list --repo SynVisions/homelab-status --state all --search "REHEARSAL: pushover-debounce" --json number,title,state
      # For each surviving issue: gh issue delete <N> --repo SynVisions/homelab-status --yes
      ```

      *Verification:* `gh issue list --repo SynVisions/homelab-status --state all --search "REHEARSAL: pushover-debounce" --json number -q 'length'` returns `0`.

## Deviations

_No deviations._
