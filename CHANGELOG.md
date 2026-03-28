# Changelog

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
