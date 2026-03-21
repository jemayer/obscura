# Changelog

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
