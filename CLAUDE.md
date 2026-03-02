# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Obscura is a static site generator for photography portfolio websites, written in TypeScript/Node.js. See `docs/product/PRD.md` for the full spec.

## Commands

- `npm run typecheck` — type-check without emitting
- `npm run compile` — compile TypeScript to dist-build/
- `npm run lint` — ESLint (strict, no `any`)
- `npm run format` — Prettier (auto-fix)
- `npm run format:check` — Prettier (check only)
- `npm run build` — incremental site build to dist/ (cached images are preserved)
- `npm run build:clean` — full clean build (wipes dist/ and .cache/)
- `npm run dev` — watch mode with incremental rebuild
- `npm run dev:clean` — watch mode with clean initial build
- `npm run sidecar` — interactive sidecar YAML editor (fill in titles, locations, captions, tags)
- `npm test` — run Vitest test suite

## Architecture

The build pipeline flows in stages:

1. **Config loading** (`src/config.ts`) — parse `config/site.yaml` and `config/galleries.yaml`
2. **Content pipeline** — EXIF reading → sidecar generation → metadata merging → slug indexing → gallery/post/page loading → shortcode resolution → cross-reference graph
3. **Image processing** — resize at breakpoints, WebP conversion, thumbnail generation (via sharp)
4. **Rendering** — Nunjucks templates produce HTML pages, RSS feed, sitemap
5. **Output** — everything writes to `dist/`

Core types live in `src/types.ts` — these are the contract between pipeline stages.

## Key Conventions

- **TypeScript strict mode** — no `any`, ever. Both tsconfig and ESLint enforce this.
- **ESM** — the project uses ES modules (`"type": "module"` in package.json). Use `.js` extensions in imports.
- **Readonly types** — all interfaces use `readonly` properties. Data flows forward, never mutated in place.
- **Conventional Commits** — format: `<type>(<scope>): <description> [TICKET-ID]`
- **Beans ticketing** — file-based tickets in `.beans/`. Every commit references a ticket ID. Check `beans list --ready` for available work.
- **ADRs** — architectural decisions are in `docs/adr/`. Write an ADR before implementing a significant technical choice.
- **Test coverage mandatory** — a feature is not done until its tests pass (Vitest).

## Directory Layout

- `src/` — TypeScript source (compiles to `dist-build/`)
- `config/` — site.yaml, galleries.yaml
- `content/photos/<gallery>/` — photos + sidecar YAML files
- `content/posts/` — Markdown blog posts
- `content/pages/` — simple Markdown pages
- `themes/` — theme directories (CSS, templates, manifest)
- `dist/` — generated site output (gitignored)
- `.cache/` — build cache (image processing manifest, gitignored)
- `docs/` — PRD, ADRs, user documentation
- `.beans/` — project tickets

## Error Policy

- Missing/ambiguous photo shortcodes, unsupported image formats → **hard error** (build fails)
- Missing/corrupt EXIF data → **warn and continue**
