---
# comagen-kdpp
title: Rename comagen to Obscura
status: completed
type: task
priority: normal
created_at: 2026-03-01T20:13:31Z
updated_at: 2026-03-01T22:01:22Z
---

I don't like the name "comagen" - this was just a placeholder. There's a better
name now, and I even have a punchline!

The static site generator will be called "Obscura".
The punchline is "Less webpack, more f-stop."

Please make sure to rename all references in the code and all corresponding
documentation. Ideally, we even find some space for the punchline in the
footer ("Built with Obscura. Less webpack, more f-stop!")?

What about renaming the git-repository? And from now on, should tickets be
prefixed with "obscura" rather than "comagen"?

Oh, I'm so in love with the name!

## Summary of Changes

Renamed all references from "comagen" to "Obscura" across the project:

**Source code** (5 files): CLI output strings, sidecar header template
**Config** (3 files): package.json name, .beans.yml prefix → obscura-, theme manifest author
**Templates** (3 files): footer now reads "Built with Obscura. Less webpack, more f‑stop.", CSS/JS comment headers
**Documentation** (16 files): PRD, ADRs, getting-started, CLI reference, content model, deployment, theming guides
**Content** (3 files): about page, welcome post, tags
**Sidecar YAMLs** (29 files): auto-generated comment headers
**Tests** (1 file): temp dir prefixes, sidecar comment assertions
**README**: rewritten with new name and punchline

Historical .beans/ ticket files left as-is (they use comagen- prefixed IDs).
New beans will use obscura- prefix.
