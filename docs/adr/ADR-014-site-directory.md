# ADR-014: Dedicated `site/` Directory for User-Owned Content

- **Date:** 2026-03-21
- **Status:** Accepted

## Context

Obscura is both a tool (source code, built-in themes, build pipeline) and a workspace where users create their site (config, photos, posts, pages, custom themes). Currently these concerns are interleaved at the project root:

```
config/          ← user content
content/         ← user content
themes/          ← Obscura source
src/             ← Obscura source
docs/            ← Obscura source
```

This creates three problems:

1. **Merge conflicts on upstream updates.** Users who fork or subtree Obscura to manage their site in git will collide with upstream changes in `config/` and `content/` (even though these directories are scaffolded, not shipped with real content). More critically, users who want to customize or create themes must work in `themes/`, which *is* shipped with upstream content.

2. **Confusing `.gitignore`.** The gitignore must carve out exceptions by file extension inside `content/photos/` while keeping everything else. Adding user theme directories to the ignore list makes the file harder to reason about — it's no longer clear what's "mine" vs. "theirs."

3. **No safe place for custom themes.** A user who copies `themes/editorial/` to modify it will lose their changes on the next upstream pull. There is no defined location for user-created themes that won't conflict.

## Decision

Introduce a `site/` directory at the project root as the single home for all user-owned content:

```
site/
  config/        ← was config/
  content/       ← was content/
  themes/        ← new: user/custom themes
```

Built-in themes remain in `themes/` at the project root — they are Obscura source code, not user content.

### Theme resolution

When `theme: foo` is specified in `site/config/site.yaml`:

1. Check `site/themes/foo/` first (user-owned)
2. Fall back to `themes/foo/` (built-in)

This allows users to fork a built-in theme by copying it to `site/themes/` and modifying it there, or to create entirely new themes without touching upstream files.

### The `site/` directory is not configurable

The path is fixed by convention. This keeps the mental model simple: `site/` is yours, everything else is Obscura's. No configuration option to discover or misconfigure.

### Migration

A `npm run migrate` command detects the old layout (checks for `config/site.yaml` at the project root) and moves `config/` and `content/` into `site/`. The build pipeline also warns if it detects the old layout and suggests running the migration.

### `.gitignore` simplification

With the boundary made explicit, `.gitignore` becomes easier to reason about:

- **Build artifacts** (`dist/`, `dist-build/`, `.cache/`, `node_modules/`) — always ignored, always regenerated.
- **Large photo binaries** (`site/content/photos/**/*.{jpg,jpeg,...}`) — ignored because they're too large for git (per ADR-011). Everything else under `site/` is not ignored and can be committed at the user's discretion.
- **OS noise** (`.DS_Store`, `Thumbs.db`) — standard ignores.

Nothing under `site/` is blanket-ignored. The only carve-out is photo binaries, with a clear documented reason. Users who deploy via CI (GitHub Pages, Netlify) can commit their entire `site/` directory; users who build locally don't need to think about it at all.

## Consequences

- **Clean separation.** Users can fork or subtree Obscura and manage their site content in `site/` without ever conflicting with upstream changes. `git pull` updates source code and built-in themes; `site/` is untouched.
- **Safe theme development.** Custom themes in `site/themes/` are invisible to upstream. Users can iterate freely, and the two-tier resolution means they can selectively override a built-in theme.
- **Breaking change.** All path references in source code, documentation, tests, and examples must be updated. Existing users must run `npm run migrate` or manually move their directories. This is a one-time cost.
- **Slightly deeper nesting.** Paths like `site/content/photos/gallery/photo.yaml` are one level deeper than before. This is a minor ergonomic trade-off for a much clearer ownership model.
- **`npm run init` scaffolds into `site/`.** New users get the right structure from the start, with a message explaining that everything under `site/` is theirs.
