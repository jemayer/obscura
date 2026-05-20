# ADR-015: Generator Meta Marker in Rendered HTML

- **Date:** 2026-05-20
- **Status:** Accepted

## Context

The site recovery tool (see `docs/superpowers/specs/2026-05-20-site-recovery-design.md`) needs to reliably identify an Obscura-generated site from its rendered HTML, and needs to know which theme produced it. Without an explicit marker, identification would require fragile heuristics — checking for known CSS class names, expected URL structures, or sitemap presence — none of which uniquely distinguish Obscura from other static site generators or themed CMSes.

A second concern: future recovery-tool versions may need to handle differences in upstream HTML shape (e.g. if a future theme changes the `.photo-meta` markup). Embedding the Obscura version makes that compatibility check trivial.

Alternatives considered:

- **Heuristic detection (combination of CSS classes + URL structure)** — brittle, fails when themes are forked or templates are customised
- **A separate `/.obscura.json` manifest at the site root** — easy to forget when deploying; not present on existing sites; cannot be trusted as authoritative
- **`X-Generator` HTTP response header** — depends on hosting setup; many static hosts don't allow custom headers per file; not visible in archived HTML

## Decision

All built-in themes emit a generator meta tag in `base.html`:

```html
<meta name="generator" content="Obscura" data-theme="{{ site.theme }}" data-version="{{ obscura_version }}">
```

- `content="Obscura"` — the standard `<meta name="generator">` convention; identifies the tool unambiguously
- `data-theme` — the active theme name, as configured in `site.yaml`
- `data-version` — the Obscura version that built the site, read from `package.json` at build time

The rendering pipeline exposes `obscura_version` to all templates as part of the template context.

### Stability commitment

The `<meta name="generator" content="Obscura">` tag and its `data-theme` attribute are a stable contract that downstream tools (recovery, future analytics, third-party integrations) may depend on. They will not be removed or renamed without an ADR superseding this one. The `data-version` attribute is purely informational and its format may evolve.

### User opt-out

Users who do not want a generator marker in their public HTML can override `base.html` in `site/themes/<theme>/templates/base.html` and remove the tag. They lose recovery support for that site, which is documented in the recovery feature's user-facing docs.

## Consequences

- **Reliable identification.** The recovery tool's identify stage becomes a one-line check rather than a pile of heuristics.
- **Cheap version negotiation.** Future recovery-tool versions can switch parsing strategies based on `data-version` without elaborate detection.
- **Tiny HTML footprint.** A single `<meta>` tag per page; no measurable performance or SEO impact.
- **One-time template change.** All built-in themes' `base.html` must be updated together. Custom themes inherit this if they extend a built-in `base.html`; standalone custom themes need to add the tag themselves to be recoverable.
- **Implicit telemetry concern.** The tag does not phone home — it's purely a static marker in the user's own HTML. Users can remove it; we document this option.
