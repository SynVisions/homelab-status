# pushover-alert-debounce — Open questions (plan)

---

# Overall Plan User Feedback and Questions from User

<!-- Reserved for the user. -->

---

# Agent Questions for User

## Q1. Do you want the GitHub issue suppressed too, or only Pushover?

**Recommendation:** Pushover-only debounce. Rely on Upptime's existing 15-minute auto-delete (the `skipDeleteIssues: false` default this repo already runs) to clean up issues for outages 0–15 min. Outages 15–20 min will leave a *closed* issue on the repo (Upptime closes on recovery but does not delete past the 15-min cutoff). Outages 20+ min leave an *open* issue with the `pushover-sent` label.

**Why this and not the alternative(s):** The most natural alternative is to have the debounce workflow itself delete (or close-and-comment) any issue whose 20-min debounce timed out without the service still being down. That works, but introduces a small amount of state coupling between our workflow and Upptime's own summary.ts deletion logic — both ends could race on the same issue. Pushover-only debounce keeps the responsibilities cleanly separated: Upptime owns the issue lifecycle, our workflow owns the Pushover decision. The downside is that ~15–20-minute outages will leave a closed issue you can see in the repo's "closed" issue tab, but it won't be in your "open" feed and won't notify you.

**Cost of override:** If you pick "also delete the issue when debounce expires without paging", the task gains ~10 lines (a `gh issue delete` call inside the early-return branch of `notify-down`). Slightly more risk of fighting with Upptime's own deletion logic, but not high.

### User Feedback

The user initially questioned the recommendation, having observed Upptime auto-delete a transient outage's issue earlier in the day. Clarified that option 1 still allows Upptime's 0–15 min auto-delete (which is what they saw) and that the gap is only the 15–20 min band. After clarification, the user chose **option 2: also have our workflow delete the issue when debounce expires unpaged**.

**Resolution:** Plan updated to cover the 15–20 min gap by having `notify-down`'s post-sleep step branch on `gh issue view`'s `state` field:

- `OPEN` → page + label.
- `CLOSED` → `gh issue delete` (the new branch the user requested).
- `DELETED` → exit; Upptime already handled it.

The workflow uses `${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}` because `deleteIssue` GraphQL requires repo-admin scope. See `implementation-plan.md` § "Structural notes" for token-elevation details, and `tasks/task-01-debounce-pushover.md` Step 2 for the updated workflow body. Closeout rehearsal A in `tasks/task-02-closeout.md` was retimed to close at T+17min (mid-window) so it actually exercises the `CLOSED → delete` branch.

**STATUS: RESOLVED**

---

## Q2. Do you want the "UP" Pushover at all, or only "DOWN"?

**Recommendation:** Keep the "UP" Pushover, gated on `pushover-sent`. You only see "UP" when you saw "DOWN", so it functions as a "your real outage has cleared" confirmation rather than noise.

**Why this and not the alternative(s):** The alternative is silencing "UP" entirely — you'd only ever get pinged about down events. Some operators prefer that (less phone noise). But with the `pushover-sent` gate, the "UP" page only fires for outages you already cared about (≥20 min), so it's information-dense rather than noisy. The status page itself is the authoritative current-state surface; the "UP" page is just the closeout for an alert that was already in your awareness.

**Cost of override:** Drop the entire `notify-up` job from the workflow. ~25 fewer lines. Simpler. Trivial to change later.

### User Feedback

Keep UP, gated on `pushover-sent`.

**Resolution:** No change to the drafted workflow — `notify-up` stays, with the `pushover-sent` label gate already in the draft.

**STATUS: RESOLVED**

---

## Q3. Is the 20-minute threshold exactly right, or do you want margin?

**Recommendation:** Sleep `1200` seconds (exactly 20 min). The user's request was "20 minutes (or 4 consecutive 5-minute checks)". A 20-min sleep aligns with the user's stated intent and the 4-cycle natural cadence: checks fire at T=0, T=5, T=10, T=15. The 5th check at T=20 happens at roughly the same moment we wake up — there's a small race where a recovery probe at T=20.0 and our wake-up at T=20.0 could land in either order, but the worst-case outcome is a single false "UP" (we page DOWN, Upptime closes, our `notify-up` fires UP) within a 30-second window.

**Why this and not the alternative(s):** The conservative alternative is sleep 1320s (22 min) — this guarantees Upptime's 5th check at T=20 has either confirmed-down (issue still open) or recovered (issue closed) before we evaluate. Sub-second-precision pages don't matter for a homelab availability page, so we'd be trading 2 extra minutes of "ah, the page is delayed slightly" for elimination of a corner case that even when it bites is at worst one false transition.

**Cost of override:** Change `sleep 1200` to `sleep 1320` (or any other number). Trivial single-character edit.

### User Feedback

1200 s = 20 min exactly.

**Resolution:** No change to the drafted workflow — `sleep 1200` already in the draft.

**STATUS: RESOLVED**

---

## Q4. Should the closeout-task rehearsals (Task 02 Steps 3–4) actually run, or skip them?

**Recommendation:** Run both rehearsals. They take ~45 minutes of wall time and burn one test Pushover, but they're the only way to verify the dual-job split, the label-based gating, and the `gh issue view` early-return path all work in the actual GitHub Actions environment. The cost of skipping is that the first real outage becomes the first real test — and if there's a bug, you don't get paged on a genuine outage.

**Why this and not the alternative(s):** Skip-rehearsals saves ~45 minutes but trades that against discovering a workflow bug at the worst possible moment. The first real outage is also a high-stakes confidence check; we should not learn there.

**Cost of override:** Mark Task 02 Steps 3–4 as skipped in the worklog, document the trade-off explicitly. The next outage becomes a live experiment.

### User Feedback

Run both rehearsals.

**Resolution:** No change — rehearsals stay in `tasks/task-02-closeout.md`. Rehearsal A's timing was retuned (per Q1's resolution) to close at T+17min so it exercises the new `CLOSED → delete` branch rather than mooting it via Upptime's own 15-min auto-delete.

**STATUS: RESOLVED**

---

## Q5. Note: `sync-main` is incompatible with this repo's `master` branch — flag for the SDLC plugin operator.

**Recommendation:** Skip the `sync-main` pre-flight step for this bundle and run a manual `git log master..HEAD` check at closeout instead. The SDLC plugin's `sync-main` helper hardcodes `refs/heads/main` (verified in `~/.claude/plugins/cache/synvisions-agentic-sdlc/sdlc/0.5.2/bin/sync-main`) and exits 4 on a repo whose main branch is `master`. The freshly-created worktree off `refs/heads/master` is by definition current with master, so the safety check is a no-op anyway. This open question is filed mainly to record that the SDLC plugin needs a `master`-aware variant (or a config knob) before more bundles are drafted in this repo.

**Why this and not the alternative(s):** The alternatives are (a) rename `master` to `main` in this repo, which is invasive and touches Upptime template assumptions, GitHub default-branch UI, and gh-pages deploys; (b) patch the SDLC plugin locally to read a `main_branch` field from `.claude-sdlc.config.json`. Both are out of scope for this bundle, which is about Pushover.

**Cost of override:** None for *this* bundle. The follow-up SDLC-plugin fix is a separate piece of work that lives elsewhere.

### User Feedback

Informational; not asked interactively. The bundle proceeds without `sync-main` since the freshly-created worktree off `master` is by definition current.

**Resolution (superseded — see updated resolution below):** Closeout task uses a manual fast-forward merge of `bundle/draft-pushover-alert-debounce` → `master` rather than `bundle-merge --teardown` (see `tasks/task-02-closeout.md` Step 8). A separate follow-up for SDLC-plugin `master`-awareness is filed outside this bundle.

**Updated resolution (2026-05-13 review-plan pass 2):** Collapsed. SDLC plugin 0.5.4 reads `main_branch` from `.claude-sdlc.config.json` in both `sync-main` and `bundle-merge`; the config now declares `"main_branch": "master"` (landed on master as commit `cc74bed`, then merged into this branch via rebase). `sync-main` ran clean at the start of this review pass. `tasks/task-02-closeout.md` Step 8 has been replaced with `bundle-merge --teardown`. No separate follow-up needed.

**STATUS: RESOLVED**

---

## Q6. Do we do the NNNN allocation + directory rename + INDEX row by hand, or skip the SDLC bundle-numbering ceremony entirely?

**Recommendation:** Do it by hand at plan-acceptance time. The `bundle-merge` helper is hardcoded to `refs/heads/main` and so cannot run in this `master`-branch repo — but the rename-mode work it would have done at plan-only first-acceptance (allocate the next free NNNN — `0001`, since `docs/bundles/INDEX.md` is empty; `git mv docs/bundles/draft-pushover-alert-debounce docs/bundles/0001-pushover-alert-debounce`; set `number: 0001` in `implementation-plan.md` frontmatter; append an INDEX row above the `<!-- bundle-merge: insert new rows above this line. -->` marker) is independent of branch naming and worth preserving. Without it, this bundle stays as `draft-pushover-alert-debounce` forever, never gets an INDEX row, and is discoverable only by directory scan — at odds with every other bundle the SDLC plugin will produce in this repo.

**Why this and not the alternative(s):** The alternative is to lean on Q5's "treat this as a no-op until SDLC plugin is patched for `master`" posture and skip the ceremony entirely. That keeps the acceptance turn smaller, but creates two follow-ups: (a) document that `draft-*` directories in this repo are acceptable, contradicting `docs/bundles/README.md` § Layout; (b) decide what `bundle-merge` should do to this bundle when it eventually runs against a future bundle in the same repo — it might see the existing `draft-*` and try to allocate `0001` against a slug that already lives under `draft-`. Manual ceremony avoids both follow-ups at the cost of ~5 minutes of editing now.

**Cost of override:** If you choose "skip ceremony entirely": remove the rename step from acceptance, drop the INDEX-row verification from Task 02 Step 6, and accept `draft-pushover-alert-debounce` as a permanent slug. The bundle's eventual fate (archive, reference from another bundle's design) becomes harder to wire up.

If you choose recommendation: this turn, before flipping `implementation_status: draft → active`:
1. `git mv docs/bundles/draft-pushover-alert-debounce docs/bundles/0001-pushover-alert-debounce` (run from inside the worktree).
2. Add `number: 0001` to `implementation-plan.md` frontmatter (between `slug:` and `design_status:`).
3. Append `| 0001 | pushover-alert-debounce | none | active | |` to `docs/bundles/INDEX.md` directly above the `<!-- bundle-merge: insert new rows above this line. -->` marker.
4. Rename the branch: `git branch -m bundle/draft-pushover-alert-debounce bundle/0001-pushover-alert-debounce`.
5. The worktree directory at `.claude/worktrees/draft-pushover-alert-debounce` stays put — `bundle-merge`'s rename mode intentionally does not rename worktree paths (`design 0059` § Architecture), and we mirror that here.
6. Task 02 Step 6 (INDEX grep) and Step 8 (manual merge sequence + worktree-remove path) get updated to reference the new bundle directory and branch name.

### User Feedback

The user is working on a fix to the SDLC plugin so `sync-main` and `bundle-merge` support repositories whose primary branch is `master`. Plan acceptance for this bundle is deferred until that fix is in: once `sync-main` / `bundle-merge` can target `refs/heads/master`, both Q5 and Q6 collapse into "let the plugin do the work" and a follow-up `/review-plan` turn will flip `implementation_status: draft → active` via the normal ceremony.

**Followup (2026-05-13, review pass 2):** Plugin fix verified in installed version 0.5.4 (both `sync-main` and `bundle-merge` source `sdlc_load_config` from `sdlc-config.sh`, which honours `main_branch` from `.claude-sdlc.config.json`). The `.claude-sdlc.config.json` edit was landed on master as commit `cc74bed` ("chore: declare master as the SDLC main_branch") and rebased into this bundle branch. Proceeding with bundle-merge.

**Resolution:** Plan acceptance this turn runs `bundle-merge` in rename mode (auto-detected from the `bundle/draft-pushover-alert-debounce` branch name). The helper allocates `0001` (INDEX is empty), `git mv`s the bundle directory to `docs/bundles/0001-pushover-alert-debounce/`, renames the branch to `bundle/0001-pushover-alert-debounce`, sets `number: 0001` in `implementation-plan.md` frontmatter, and appends the INDEX row above the `<!-- bundle-merge: insert new rows above this line. -->` marker. Worktree path stays `.claude/worktrees/draft-pushover-alert-debounce` (intentional; design 0059 § Architecture). Task 02 Step 8 was rewritten to `bundle-merge --teardown` (direct mode at closeout) and Step 2 to a mid-task `bundle-merge` + `git push origin master` to deploy Task 01's workflow before rehearsals run.

**STATUS: RESOLVED**

---
