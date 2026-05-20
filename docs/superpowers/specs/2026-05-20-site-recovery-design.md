# Site Recovery — Design Spec

- **Date:** 2026-05-20
- **Status:** Draft
- **Related:** ADR-015 (generator meta marker), beans `obscura-0p2f` (crawl fallback follow-up)

## Summary

Add a recovery tool that takes the landing URL of a deployed Obscura site and reconstructs a working local Obscura project from it. The recovered project, after a normal `npm run build`, should produce a site structurally and visually equivalent to the upstream original — using the largest available image variants in place of the (irrecoverable) originals.

The motivating scenario: a user lost their local setup but their site is still live. They need a way back in.

## Goals

- One-command recovery: `npm run recover -- <url> [target-dir]`
- Reconstruct `site/config/site.yaml`, `site/config/galleries.yaml`, all sidecar YAML files, posts, pages, and downloaded images
- The recovered project is editable, buildable, and re-deployable with no further hand-fixing required for the common case
- Be honest about what couldn't be recovered (per-photo report at the end)

## Non-goals

- Byte-for-byte HTML/CSS archival mirror of the upstream site — Obscura's own build regenerates HTML deterministically; the recovered sources are the source of truth.
- Recovering data that the upstream site never displayed: GPS coordinates, full original EXIF, `webp_quality`, content lost to crops or omissions.
- Working on non-Obscura photography sites. The MVP hard-fails if it doesn't see the generator meta marker.
- Working when `sitemap.xml` is missing. Tracked separately as `obscura-0p2f` (link-crawl fallback).

## User workflow

The recovery is a fresh-checkout flow:

1. `git clone <obscura repo>` (or download a release) and `npm install`
2. `npm run recover -- https://my-old-site.example`
3. Review `recovery-report.md` (written into the target dir); optionally tweak yaml/markdown for anything flagged as missing or partial
4. `npm run build` to regenerate `dist/`
5. Re-deploy as usual

The README's troubleshooting section will document this end-to-end under "I lost my local setup".

## Architecture

Pipeline of well-bounded stages. Each stage produces fully formed output before the next stage starts; no streaming, no shared mutable state.

```
URL → fetch + identify  →  enumerate URLs  →  fetch HTML & parse
                                                      │
                       ┌──────────────────────────────┼─────────────────┐
                       ▼                              ▼                 ▼
                site.yaml + galleries.yaml      photos + sidecars   posts + pages
                                                      │
                                                      └──→ recovery-report.md
```

### Modules

The entry module is `src/recover.ts` (flat under `src/`, matching the existing `init.ts`, `migrate.ts`, `build.ts` convention). All other recovery code lives under `src/recover/`:

| Module | Responsibility |
|---|---|
| `src/recover.ts` (entry) | Orchestrates stages, prints progress, exit codes |
| `src/recover/fetch.ts` | Same-origin HTTP client: concurrency-limited (4), polite delay, retry-with-backoff |
| `src/recover/identify.ts` | Reads `<meta name="generator">`, extracts theme + version; hard-fails on non-Obscura |
| `src/recover/sitemap.ts` | Parses `/sitemap.xml`, categorises URLs into galleries / photos / posts / pages |
| `src/recover/parse-site.ts` | Extracts `SiteConfig` fields from the homepage |
| `src/recover/parse-gallery.ts` | Extracts `GalleryEntry` info from a gallery index page |
| `src/recover/parse-photo.ts` | Extracts `PhotoMetadata` from a photo detail page |
| `src/recover/parse-post.ts` | Blog post: frontmatter + Turndown HTML→Markdown + photo-shortcode rewriting |
| `src/recover/parse-page.ts` | Generic page: frontmatter + Turndown HTML→Markdown |
| `src/recover/download-image.ts` | Picks the largest srcset variant, downloads it |
| `src/recover/write.ts` | Writes the assembled project to disk |
| `src/recover/report.ts` | Emits `recovery-report.md` |

Each parser takes a fully fetched HTML string (or parsed DOM) and returns a typed value (`SiteConfig` / `PhotoMetadata` / etc.) plus a list of per-field warnings. No parser touches the filesystem or the network. This makes them trivially unit-testable from fixtures.

## Data extraction — what we pull from each page type

### Homepage → `site/config/site.yaml`

| Source in HTML | Field |
|---|---|
| `<meta name="generator" data-theme=…>` | `theme` |
| `<title>` minus suffix, or site header `<h1>` | `title` |
| Site header subtitle element | `subtitle` |
| `<meta name="description">` | `description` |
| `<meta property="og:url">` host | `base_url` |
| Footer social icon `<a href>` patterns | `social_links[]` |
| Nav `<a>` items if they differ from the default menu | `navigation[]` |
| Union of widths observed across all `<img srcset>` | `images.breakpoints` |
| Footer photographer credit (if present) | `default_photographer` |

`recent_shots_count` is left at its default; we cannot reliably infer it from the homepage shot count (which may be capped by available photos).

### Photo page (`/photography/<gallery>/<photo>/`) → sidecar YAML + image file

| Source in HTML | Sidecar field |
|---|---|
| `<h1 class="photo-detail__title">` | `title` |
| `<p class="photo-detail__caption">` | `caption` |
| `<time datetime="…">` inside `Date` `<li>` | `date` |
| `Camera` `<li>` value | `camera` |
| `Lens` `<li>` value | `lens` |
| `Settings` `<li>` — independently regex-matched | `focal_length`, `aperture`, `iso`, `shutter_speed` |
| `Location` `<li>` link text | `location` |
| `Tags` `<li>` `<a>` text values | `tags[]` |
| `Photographer` `<li>` value | `photographer` (if differs from site default) |
| `License` `<li>` href/text | `license` (if differs from site default) |
| Largest variant from `<img srcset>` | downloaded image file |

Always omitted (not recoverable): `gps_lat`, `gps_lon`, original EXIF beyond what's displayed.

### Gallery index (`/photography/<gallery>/`) → entry in `galleries.yaml`

- `slug` from URL segment
- `title` from `<h1>`
- `description` from gallery-intro paragraph if present
- `listed: true` if the gallery is linked from `/photography/`; `false` otherwise (e.g. `post-assets`)
- `layout` inferred from CSS class on the gallery container (`gallery--grid` vs `gallery--masonry`) only if distinguishable; otherwise omitted to inherit site default

### Blog post (`/blog/<slug>/`) → `site/content/posts/<slug>.md`

Frontmatter:
- `title` from `<h1>`
- `date` from `<time datetime>` in the post header
- `tags` from tag chip texts
- `summary` from `<meta name="description">` or lead paragraph

Body: Turndown converts the post body HTML to Markdown. A post-pass walks the resulting Markdown and rewrites image references that point at `/photography/<gallery>/<slug>/` URLs (or the photo-page URLs Obscura emits) back into `{{photo:gallery/slug}}` shortcodes. References to non-photo URLs are left as plain Markdown links/images.

### Page (`/<slug>/`) → `site/content/pages/<slug>.md`

Same Turndown pipeline as posts, with frontmatter limited to `title`.

### Tag / location pages

Not extracted. They re-emerge automatically when Obscura rebuilds from the recovered photo sidecars.

## Missing / partial data handling

The rule: **the recovered sidecar must be a strict subset of what the upstream site clearly stated.** A field that cannot be confidently parsed is omitted — never invented, never written as `null` or `""`.

- **Photo metadata fields** — each `<li>` in `.photo-meta` is independently gated by the template. The parser looks up each by its `.photo-meta__label` text; missing labels mean missing fields, which means omitted YAML keys.
- **Settings line** — could be partial. The parser scans for each pattern independently:
  - `/\b(\d+)mm\b/` → `focal_length`
  - `/\bf\/([\d.]+)\b/` → `aperture`
  - `/\bISO\s+(\d+)\b/` → `iso`
  - `/\b(\d+\/\d+|\d+(?:\.\d+)?)s\b/` → `shutter_speed`
- **Photographer** — if hidden site-wide (`default_photographer` is set upstream), it won't appear on photo pages. Falls back to the footer credit, written once to `default_photographer` in site.yaml. Footer-credit detection is theme-specific; the MVP supports the bundled `editorial` theme. For unknown themes the field is left blank with a report note rather than guessed.
- **License** — if all photos share a license, hoist it to `site.yaml`'s `license:`. Photos that display a different license get a per-sidecar override.
- **Image variants** — if `srcset` is missing, fall back to bare `<img src>`. If neither resolves, log a per-photo warning to the report and write the sidecar without an image.
- **Site-level optionals** — `subtitle`, `description`, `social_links`, `navigation`, `hero_image`, `default_photographer`: each written only if confidently detected.

Every skip and per-item issue gets a line in `recovery-report.md`, grouped by category, so the user can see what to fill in.

## Error handling

Boundary conditions and their behaviour:

| Failure | Behaviour |
|---|---|
| URL unreachable, non-HTML response, or missing generator meta | Hard error, exit non-zero, no files written |
| `sitemap.xml` missing or unreadable | Hard error, point user at `obscura-0p2f` |
| Theme name unknown (not in built-in `themes/`) | Warn, write `theme: <name>` anyway, report note "theme not bundled — install or rename" |
| Individual HTTP 404 / 5xx on a photo / post / page | Warn, skip that item, list in report |
| Image variant download fails after retries | Warn, write sidecar without image, list in report |
| Markdown conversion throws on a post/page body (rare — Turndown is defensive) | Warn, save raw HTML body to `<slug>.html` next to the .md stub, list in report |
| Target dir non-empty and no `--force` | Hard error before any work |

This mirrors Obscura's existing error policy from CLAUDE.md (hard error on identity / structure, warn-and-continue on individual content).

## CLI shape

```
npm run recover -- <url> [target-dir] [--force]
```

- `<url>` — landing URL of an Obscura site (required)
- `[target-dir]` — defaults to `./` (the current Obscura checkout). If `site/` already exists with content, refuses unless `--force`.
- `--force` — overwrite existing `site/` content. Pre-existing files are deleted before write.

`recovery-report.md` is written at `<target-dir>/recovery-report.md` (sibling of `site/`), not inside `site/` — it's a one-shot diagnostic, not user content.

Implementation hooks into the existing `src/cli.ts` dispatcher and `package.json` scripts, following the same shape as `init` and `migrate`.

## Upstream contract: generator meta marker

For reliable identification, all built-in themes' `base.html` emits:

```html
<meta name="generator" content="Obscura" data-theme="{{ site.theme }}" data-version="{{ obscura_version }}">
```

`obscura_version` is read from `package.json` at build time and exposed to templates by the rendering pipeline. ADR-015 captures the rationale and stability commitment.

## Testing strategy

Vitest, matching the existing test layout. Three tiers:

**Unit (parsers — bulk of the value)** — `test/recover/parse-*.test.ts`
- Each parser gets a `fixtures/` folder of HTML snippets captured from a known-good build of `examples/default-site/`.
- For each fixture, assert the extracted typed value exactly matches the expected object.
- Adversarial fixtures per parser cover the missing-field matrix: photo with no caption, no location, partial settings line (`f/1.8` only), no tags. Each must produce output with only the keys it could prove.
- One fixture per "shape variant" of the Settings line (full, no focal length, no shutter, ISO only, empty).
- HTML-to-Markdown fixtures: a post with a `{{photo:...}}` shortcode that round-trips through build → recover and produces equivalent (not byte-identical) Markdown.

**Integration (round-trip on the example site)** — `test/recover/roundtrip.test.ts`
1. Build `examples/default-site/` into a temp `dist/`
2. Serve `dist/` via an in-process `node:http` server on a random port
3. Run `recover` against the server URL into a temp target dir
4. Assert:
   - `site/config/site.yaml` deep-equals the original modulo unrecoverable fields
   - Each sidecar YAML deep-equals the original modulo unrecoverable fields
   - Every original photo has a downloaded image file at the expected path
   - `recovery-report.md` has zero "missing" entries for fields the original had

**Identification** — `test/recover/identify.test.ts`
- Generator meta present + recognised theme → ok
- Generator meta present + unknown theme → ok with warning
- Generator meta absent → hard error
- Non-HTML response at landing URL → hard error

No network tests against real sites. The in-process server makes the round-trip both fast and hermetic.

## Dependencies

- `turndown` — HTML to Markdown conversion (new)
- `cheerio` — DOM parsing with jQuery-like traversal API (new). Chosen over `node-html-parser` because the parsers do non-trivial label-text lookups (`.photo-meta__label` text → adjacent `.photo-meta__value`), and cheerio's selector + traversal ergonomics keep parser code small and readable.
- All other needs (`yaml`, `node:fs`, `node:http`, `node:fetch`) are already in the project

## Out of scope / follow-ups

- **Link-crawl fallback** when sitemap is missing — `obscura-0p2f`
- **Best-effort recovery of non-Obscura photography sites** — explicitly out of scope; would require structural guessing and produce inconsistent output
- **Original-resolution image recovery via paid CDN APIs** — out of scope; the largest displayed variant is the recovery contract
