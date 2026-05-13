# Bundle Index

Bundles are listed with both status fields plus a `derived_from` column that records the parent design bundle when one exists (umbrella case). For most bundles `derived_from` is empty — they either have no design phase, or their `design.md` lives in the same bundle.

Status values are written into the table by `bundle-merge` at first-acceptance and umbrella-acceptance; they are not retroactively updated as a bundle's frontmatter advances, so a `completed` or `archived` row may show the values that were true at row-write time rather than the bundle's current frontmatter.

See [`README.md`](README.md) for bundle conventions, lifecycle, and the meaning of each status value.

| #    | Slug | design_status | implementation_status | derived_from |
|------|------|---------------|-----------------------|--------------|
<!-- bundle-merge: insert new rows above this line. -->
