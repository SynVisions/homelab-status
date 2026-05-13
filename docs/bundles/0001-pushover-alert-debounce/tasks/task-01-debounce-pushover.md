# Task 01 — Debounce Pushover via custom workflow

## Goal

Replace `.github/workflows/pushover-on-incident.yml` with a two-job version that (a) sleeps 20 minutes after an Upptime-opened issue, re-checks state, and either pages (if still open) or deletes the issue (if already closed by Upptime on recovery); and (b) on issue close, only pages "UP" if the matching open actually paged (tracked via a `pushover-sent` label). After this task, a transient failure under 20 min leaves no Pushover and no visible issue — Upptime's own auto-delete handles the 0–15 min band; this workflow's `gh issue delete` covers the 15–20 min band.

## Preamble

The current workflow (`.github/workflows/pushover-on-incident.yml`, 34 lines) fires Pushover the instant Upptime opens or closes an incident issue. The replacement keeps the same trigger (`on: issues: [opened, closed]`) and the same label gate (`contains(github.event.issue.labels.*.name, 'status')`) but splits the body into two `jobs:` keyed on `github.event.action`. See `../implementation-plan.md` § "Structural notes" for the rationale behind the 20-minute threshold and the `pushover-sent` label mechanism.

The sleep happens on a GitHub-hosted runner. The repo is public, so GitHub-hosted runner minutes are free — there is no cost concern with a 20-minute idle hold per outage. The default job timeout (6h) is comfortably above 20 min, so no `timeout-minutes:` override is needed (but we'll set one defensively at 30 min).

## Steps

- [x] **Step 1 — Verify the `GH_PAT` repo secret exists.** The CLOSED→delete branch of the workflow calls `gh issue delete`, which uses GraphQL `deleteIssue` and requires repo-admin scope — the default `GITHUB_TOKEN` cannot satisfy it. The workflow falls back to `GITHUB_TOKEN` if `GH_PAT` is missing, so the failure mode is non-fatal at runtime (the delete branch silently fails), but it defeats the bundle's whole point. Confirm `GH_PAT` is present *before* editing the workflow.

      *Verification:* `gh secret list --repo SynVisions/homelab-status | grep -q '^GH_PAT'` exits 0. If it is missing, stop and surface to the user — the design needs to flip to `gh issue close` (which works on `GITHUB_TOKEN`) and accept a closed-issue rump in the 15–20 min band, or `GH_PAT` needs to be provisioned first.

- [x] **Step 2 — Read the current workflow into context.** Open `.github/workflows/pushover-on-incident.yml` and confirm it still matches the shape recorded in `../implementation-plan.md` § Preconditions (34 lines, single `notify` job, fires on both `opened` and `closed`). If it has been edited since this plan was drafted, surface the diff to the user before continuing — the per-event split assumes the current body.

      *Verification:* `wc -l .github/workflows/pushover-on-incident.yml` returns 34 and `grep -c 'on:' .github/workflows/pushover-on-incident.yml` shows the existing single `on:` block.

- [x] **Step 3 — Replace the workflow.** Overwrite `.github/workflows/pushover-on-incident.yml` with the version below. The two jobs share the `if:` label gate but key on `github.event.action` so they are mutually exclusive per workflow run.

      ```yaml
      name: Pushover on incident
      on:
        issues:
          types: [opened, closed]

      jobs:
        # Issue OPENED — debounce 20 minutes, then page only if still open.
        notify-down:
          if: |
            github.event.action == 'opened'
            && contains(github.event.issue.labels.*.name, 'status')
          runs-on: ubuntu-latest
          timeout-minutes: 30
          permissions:
            issues: write
          steps:
            - name: Wait 20 minutes for outage to either persist or resolve
              # 4 × 5-min Upptime cycles. If Upptime sees the service recover
              # in this window it closes (and probably deletes) the issue;
              # we then exit without paging.
              run: sleep 1200

            - name: Re-check issue state, delete or page accordingly
              env:
                # Use the same elevated PAT Upptime itself uses; GITHUB_TOKEN
                # cannot deleteIssue via GraphQL (the operation requires
                # repo-admin/maintainer scope, which the default token lacks).
                GH_TOKEN: ${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}
                PUSHOVER_APP_TOKEN: ${{ secrets.PUSHOVER_APP_TOKEN }}
                PUSHOVER_USER_KEY: ${{ secrets.PUSHOVER_USER_KEY }}
                ISSUE_NUMBER: ${{ github.event.issue.number }}
                ISSUE_TITLE: ${{ github.event.issue.title }}
                ISSUE_URL: ${{ github.event.issue.html_url }}
                REPO: ${{ github.repository }}
              run: |
                set -euo pipefail

                # Three cases at T+20min:
                #   OPEN    → service still down → page + label.
                #   CLOSED  → Upptime closed on recovery but didn't auto-delete
                #             (outage was 15–20 min, past summary.ts's cutoff).
                #             Delete the issue so it doesn't leave a closed-tab
                #             rump for a sub-threshold outage.
                #   DELETED → Upptime already auto-deleted (outage <15 min). Done.
                state="$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json state -q .state 2>/dev/null || echo "DELETED")"

                case "$state" in
                  DELETED)
                    echo "Issue $ISSUE_NUMBER already deleted by Upptime auto-delete; nothing to do."
                    exit 0
                    ;;
                  CLOSED)
                    echo "Issue $ISSUE_NUMBER closed within debounce window but past Upptime's 15-min auto-delete cutoff; deleting to suppress sub-threshold trace."
                    gh issue delete "$ISSUE_NUMBER" --repo "$REPO" --yes
                    exit 0
                    ;;
                  OPEN)
                    : # fall through to page-and-label below
                    ;;
                  *)
                    echo "Unexpected state '$state' for issue $ISSUE_NUMBER; bailing without paging." >&2
                    exit 1
                    ;;
                esac

                # OPEN at T+20min: real outage. Tag the issue so the close-event
                # branch knows to fire an "UP" page when recovery eventually lands.
                gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "pushover-sent"

                title="[homelab] DOWN: ${ISSUE_TITLE}"
                curl -sS --fail-with-body \
                  -F "token=${PUSHOVER_APP_TOKEN}" \
                  -F "user=${PUSHOVER_USER_KEY}" \
                  -F "title=${title}" \
                  -F "message=${ISSUE_URL}" \
                  -F "priority=1" \
                  -F "url=${ISSUE_URL}" \
                  -F "url_title=GitHub issue" \
                  https://api.pushover.net/1/messages.json

        # Issue CLOSED — page "UP" only if the matching open actually paged.
        notify-up:
          if: |
            github.event.action == 'closed'
            && contains(github.event.issue.labels.*.name, 'status')
            && contains(github.event.issue.labels.*.name, 'pushover-sent')
          runs-on: ubuntu-latest
          permissions:
            issues: read
          steps:
            - name: Send Pushover "UP" notification
              env:
                PUSHOVER_APP_TOKEN: ${{ secrets.PUSHOVER_APP_TOKEN }}
                PUSHOVER_USER_KEY: ${{ secrets.PUSHOVER_USER_KEY }}
                ISSUE_TITLE: ${{ github.event.issue.title }}
                ISSUE_URL: ${{ github.event.issue.html_url }}
              run: |
                set -euo pipefail
                title="[homelab] UP: ${ISSUE_TITLE}"
                curl -sS --fail-with-body \
                  -F "token=${PUSHOVER_APP_TOKEN}" \
                  -F "user=${PUSHOVER_USER_KEY}" \
                  -F "title=${title}" \
                  -F "message=${ISSUE_URL}" \
                  -F "priority=0" \
                  -F "url=${ISSUE_URL}" \
                  -F "url_title=GitHub issue" \
                  https://api.pushover.net/1/messages.json
      ```

      *Verification:* `yq '.jobs | keys' .github/workflows/pushover-on-incident.yml` returns `["notify-down", "notify-up"]`. If `yq` is not installed, fall back to `grep -E '^  notify-(down|up):' .github/workflows/pushover-on-incident.yml | wc -l` → `2`.

- [x] **Step 4 — Syntax-check the workflow.** Run `gh workflow view "Pushover on incident" --repo SynVisions/homelab-status` against the *current* (un-pushed) file by piping locally, OR — simpler — run `actionlint` if available, otherwise rely on `yq -e '.jobs.notify-down.steps | length == 2' .github/workflows/pushover-on-incident.yml` and `yq -e '.jobs.notify-up.steps | length == 1' .github/workflows/pushover-on-incident.yml` to confirm structure.

      *Verification:* Both `yq -e` invocations exit 0. If neither `actionlint` nor `yq` is installed locally, push the change on a feature branch (NOT master — `setup.yml` redeploys gh-pages on any push to master that touches `.upptimerc.yml`, but does not run on workflow-file-only pushes — verify by reading `.github/workflows/setup.yml`'s `on:` filter before pushing) and let GitHub's YAML parser reject it via Actions' "All workflows" tab.

- [x] **Step 5 — Commit the workflow change.** Conventional-commits style (per the repo's CLAUDE.md § Conventions): `feat: debounce pushover by 20 minutes via dual-job workflow`. The commit message body should reference the upstream constraint discovered during planning (Upptime's synchronous issue creation in `upptime-monitor/src/update.ts`) and point at this bundle's `implementation-plan.md` for the full rationale.

      *Verification:* `git log -1 --format=%s` matches the conventional-commits pattern. `git diff HEAD~1 --stat` shows exactly one file changed (`.github/workflows/pushover-on-incident.yml`).

## Deviations

_No deviations._
