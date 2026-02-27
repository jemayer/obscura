# ADR-009: Gallery-Namespaced Slug Strategy

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Every photo needs a unique slug for URLs and shortcode references. Photos are organised into galleries, and different galleries could contain files with the same name (e.g. `sunset.jpg` in both `landscape` and `urban`).

We need a slug strategy that:
- Guarantees uniqueness across the entire site
- Is predictable and derivable from the file path (no manual slug assignment)
- Works cleanly in URLs and shortcode syntax

Approaches considered:
- **Filename only** — not unique across galleries, requires collision detection and renaming
- **Gallery + filename** — naturally unique, mirrors the directory structure
- **Content hash** — unique but opaque, not human-readable

## Decision

Slugs are always `<gallery-slug>/<filename-without-extension>`, derived from the file path. There is no slug field in sidecar YAML — slugs are a system concern.

Shortcode references use the full namespaced slug: `{{< photo "monochromatic/berlin-rain-2024" >}}`.

If a shortcode omits the gallery prefix and the bare filename matches photos in multiple galleries, the build fails with a hard error. This is intentional — ambiguity is never silently resolved.

## Consequences

- Slugs are always unique by construction (one file, one path, one slug)
- URLs are human-readable and reflect the gallery structure: `/photography/monochromatic/berlin-rain-2024/`
- No database or index needed to generate slugs — they are derived from the filesystem
- Moving a photo between galleries changes its slug and breaks existing shortcode references — this is the correct behaviour (references should be explicit)
- The hard error on ambiguous bare slugs prevents subtle bugs where the wrong photo is displayed
