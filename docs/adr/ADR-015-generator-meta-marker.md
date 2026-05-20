# ADR-015: Extending the Generator Meta Marker for Recovery

- **Date:** 2026-05-20
- **Status:** Accepted

## Context

Obscura's built-in themes already emit a generator marker in every page's `<head>`:

```html
<meta name="generator" content="Obscura {{ build_timestamp }}">
```

where `build_timestamp` is `YYYYMMDD-HH:MM:SS` of the build (`src/rendering.ts:60-71`, `themes/editorial/templates/base.html:8`). This tag is sufficient to identify a page as Obscura-built and to know roughly when the live site was last built.

The site recovery tool (see `docs/superpowers/specs/2026-05-20-site-recovery-design.md`) needs two additional pieces of information beyond identity:

1. **Which theme produced the site** — so the recovered `site.yaml` references the right one
2. **Which Obscura version produced it** — so future recovery-tool versions can negotiate compatibility when HTML shape changes (e.g. if `.photo-meta` markup is renamed)

Neither is currently encoded. Forcing the recovery tool to fingerprint these from structural cues would be fragile and introduce drift between the upstream renderer and the downstream parser.

## Decision

Extend the existing `<meta name="generator">` tag **additively** with two `data-*` attributes, in all built-in themes' `base.html`:

```html
<meta name="generator"
      content="Obscura {{ build_timestamp }}"
      data-theme="{{ site.theme }}"
      data-version="{{ obscura_version }}">
```

- The `content` attribute keeps its existing format. Older parsers continue to work unchanged.
- `data-theme` carries the active theme name from `site.yaml`.
- `data-version` carries the Obscura package version. The rendering pipeline reads it from `package.json` at startup and exposes it as the template global `obscura_version`.

### Backwards compatibility for "older" sites

Sites built before this change have the tag without the `data-*` attributes. The recovery tool falls back as follows:

| Missing | Fallback |
|---|---|
| `data-theme` | Assume `editorial` (the current bundled default). Note the assumption in `recovery-report.md`. |
| `data-version` | Assume the recovery tool's current Obscura version. Note the assumption. |

The build timestamp in `content` is captured and included in the report for context.

### Stability commitment

The `<meta name="generator" content="Obscura …">` tag and the `data-theme` attribute are a stable contract that downstream tools (recovery, future analytics, third-party integrations) may depend on. They will not be removed or renamed without an ADR superseding this one. The `content` timestamp and `data-version` are informational; their format may evolve.

### User opt-out

Users who do not want a generator marker in their public HTML can override `base.html` in `site/themes/<theme>/templates/base.html` and remove the tag. They lose recovery support for that site, which is documented in the recovery feature's user-facing docs.

## Consequences

- **Reliable identification, today.** Every Obscura site already in the wild can be recovered without rebuilding. Older sites get sensible fallbacks; newer ones get fully informed recovery.
- **No fingerprinting.** The recovery tool's identification stage is a single tag lookup. No CSS-class heuristics, no URL-shape guesses.
- **Cheap version negotiation.** Future recovery-tool versions can switch parsing strategies based on `data-version`.
- **Tiny HTML footprint.** A single `<meta>` tag per page; no measurable impact.
- **One-time template change.** All built-in themes' `base.html` and a small addition to the rendering pipeline (expose `obscura_version`). Custom themes that extend a built-in `base.html` inherit the change; standalone custom themes need to add the attributes themselves to get the richer recovery path — but they still benefit from the existing identity-only fallback.
