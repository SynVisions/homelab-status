# `docs/`

Top-level orientation for the docs tree. Each subdirectory has its own purpose; this page points at the right place for what you're looking for.

- **[`bundles/`](bundles/README.md)** — bundles (`<NNNN-slug>/` per work item) with optional designs and mandatory implementation plans. Conventions, lifecycle, and templates in [`bundles/README.md`](bundles/README.md).
- **[`reference/`](reference/README.md)** — cross-bundle reference docs that outlive any single bundle (schema specs, design analyses, running notes). Indexed in [`reference/README.md`](reference/README.md).

<!-- Add additional subdirectories as the project grows, e.g.:
- `runbooks/` — operational procedures.
- `audits/` — point-in-time security/compliance scans.
- `snapshots/` — captured-state artifacts referenced by bundles but not tied to a single one.
-->

## Where do I write a new doc?

- About a single bundle: in that bundle (`docs/bundles/<NNNN-slug>/`), per [`bundles/README.md`](bundles/README.md) § "Persistent vs. bundle-scoped files".
- A schema or spec used across bundles: under [`reference/`](reference/README.md), and add a one-line entry to its README.
