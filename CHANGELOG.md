# Changelog

## Unreleased

### Image variants: longest-side cap and better use of source resolution

Image variant generation now caps output and stops throwing away resolution.

A new optional setting controls the maximum size of any generated variant:

```yaml
images:
  max_dimension: 2400   # default
```

It caps the **longest side** — width for landscape photos, height for
portraits — so orientations get a comparable pixel budget. A 6000x4000 original
becomes 2400x1600; a 4000x6000 portrait becomes 1600x2400. Sources already
within the cap are never enlarged.

**What changed in practice:**

- **Large originals are now bounded.** Previously a source wider than every
  breakpoint was emitted at its native size with no resize at all, so a 6000px
  original produced a 6000px WebP. Panoramas were the worst case: a 2400x7200
  source emitted 2400x7200 (17.3 MP), and now emits 800x2400 (1.9 MP).
- **Mid-size sources keep their detail.** A 2048x1365 photo used to be capped at
  the 1200px breakpoint — only 600 CSS px on a 2x display. It now also gets a
  2048w variant.
- **Portraits get a full srcset.** Breakpoints are matched on width, so a
  683x2048 portrait previously produced a *single* 400w variant despite having
  2048px of vertical detail. It now gets 400w and 683w.
- **Small photos render again.** A source narrower than the smallest breakpoint
  produced no variants at all and was silently omitted from the page — no
  warning, no build error. Such photos now get one native-size variant and
  render, with a build warning noting the low resolution.

**Upgrading:** the change invalidates the image cache automatically, so your
next `npm run build` re-processes photos and picks up the new variants. Any
oversized files already written by an earlier build are no longer referenced by
any page but are not deleted — run `npm run build:clean` once to purge them.

Sites whose originals are all 2400px or smaller on the longest side see no
change to their output.

## 0.2.1 — 2026-03-28

### Photographer field

Photos now carry a **photographer** metadata field. It is populated in this order:

1. **Per-photo sidecar** — set `photographer: Name` in the photo's YAML sidecar to override everything else.
2. **EXIF Artist tag** — when a sidecar doesn't specify a photographer, the EXIF Artist field embedded in the image is used automatically.
3. **Site-wide default** — set `default_photographer: Name` in `site/config/site.yaml` as a fallback for all photos.

If none of the above are present, the field is left empty and hidden from the UI.

The photographer appears on the photo detail page by default. In the lightbox it is hidden by default but can be enabled via `lightbox_display_fields`.

### Exclusion syntax for display fields

`photo_display_fields` and `lightbox_display_fields` now support an exclusion mode. Instead of listing every field you want, prefix fields with `-` to exclude them from the full set:

```yaml
# Show everything except photographer
lightbox_display_fields: [-photographer]
```

Inclusions and exclusions cannot be mixed in the same list.

## 0.2.0 — 2026-03-21

### Breaking: `site/` directory for user content

All user-owned content now lives under a dedicated `site/` directory, cleanly separating your data from Obscura's source code. This means upstream updates (`git pull`) will never conflict with your content or custom themes.

**What moved:**

| Before | After |
|--------|-------|
| `config/site.yaml` | `site/config/site.yaml` |
| `config/galleries.yaml` | `site/config/galleries.yaml` |
| `content/photos/` | `site/content/photos/` |
| `content/posts/` | `site/content/posts/` |
| `content/pages/` | `site/content/pages/` |

**Migrating:** Run `npm run migrate` to move your files automatically. The build will detect the old layout and prompt you.

**New users:** `npm run init` now scaffolds into `site/` directly.

### Custom themes support

User themes now live in `site/themes/` and take priority over built-in themes in `themes/`. To customise a built-in theme:

```bash
cp -r themes/editorial site/themes/editorial
# Edit site/themes/editorial/ freely
```

Your custom themes are invisible to upstream updates — no more merge conflicts when pulling theme improvements.

See [ADR-014](docs/adr/ADR-014-site-directory.md) for the full rationale.
