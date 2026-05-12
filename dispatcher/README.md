# homelab-status-dispatcher

Cloudflare Worker that fires every 5 minutes and POSTs a `repository_dispatch`
event of type `uptime` to this repo, so `uptime.yml` runs on a reliable
cadence regardless of GitHub's central `schedule:` reliability.

Designed in the operator's private homelab monorepo, bundle `0078-external-status-hosting`.

## Deploy

    npm install
    npx wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste PKCS#8 PEM
    npx wrangler deploy

Plain (non-secret) configuration lives in `wrangler.toml` `[vars]`:
`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_OWNER`, `GITHUB_REPO`.

The GitHub App is named `homelab-status-dispatcher`, owns
`Repository contents: write`, has no webhook, and is installed on this repo
only. Recovery procedures (key rotation, App uninstall) live in the source
bundle's runbook at `docs/runbooks/status-page.md` in the homelab repo.
