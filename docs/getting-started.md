# Getting Started

This guide gets you from zero to a running portfolio in five steps. You'll need [Node.js](https://nodejs.org/) 20 or later and a terminal.

## 1. Clone and Install

```bash
git clone https://github.com/jemayer/obscura.git my-portfolio
cd my-portfolio
npm install
```

That gives you the Obscura engine, the default theme, and the example content. Your site directory is created in the next step — it's not tracked in the repository, so pulling updates later won't touch your files.

## 2. Initialise the Example Site

```bash
npm run init
```

This creates `site/` with a sample gallery, pages, and a blog post. Everything under `site/` is yours — edit freely. You can skip this step if you prefer to start from scratch.

## 3. Add Your Content

### Photos

Create a gallery by adding an entry to `site/config/galleries.yaml`:

```yaml
galleries:
  - slug: street
    title: Street Photography
    description: Moments from the city
    listed: true
```

Then drop your photos into the matching folder:

```bash
mkdir -p site/content/photos/street
cp ~/Pictures/best-of/*.jpg site/content/photos/street/
```

Obscura handles the rest — resizing, WebP conversion, thumbnails, EXIF extraction. When you build, it auto-generates a sidecar YAML file for each photo, pre-filled with whatever metadata your camera embedded.

### Blog Posts

Create a Markdown file in `site/content/posts/` with a bit of frontmatter:

```markdown
---
title: My First Shoot
date: 2026-03-20
tags:
  - street
summary: A morning walk through the city with a camera.
---

Your text goes here. You can embed photos from any gallery
using a shortcode:

{{< photo "street/morning-light" >}}
```

The welcome post created by `npm run init` has a working example you can use as a starting point.

## 4. Fill In Your Metadata

The interactive sidecar editor walks you through each photo with a preview:

```bash
npm run sidecar
```

It prompts for title, location, caption, and tags — the things your camera doesn't know. Press Enter to skip any field. You can also edit the YAML files by hand if you prefer (e.g., `site/content/photos/street/photo-name.yaml`).

## 5. Build and Preview

```bash
npm run dev
```

Open http://localhost:3000. Your site rebuilds automatically when you change files — photos, posts, and pages alike.

When you're happy, build for production:

```bash
npm run build
```

The output lands in `dist/` — plain static files ready to deploy anywhere. Subsequent builds are faster because processed images are cached — only new or modified photos are re-processed. If you ever need a guaranteed-fresh build, use `npm run build:clean`.

## What's Next

- **Deploy your site** — rsync to your own server, or push to GitHub Pages, Netlify, or Cloudflare Pages. The [Deployment Guide](./deployment.md) walks through each option.
- **Customise your config** — Edit `site/config/site.yaml` to set your site title, URL, and display preferences. The [Content Model Reference](./content-model.md) covers all the options.
- **Write a blog post** — Create a Markdown file in `site/content/posts/` and use photo shortcodes to embed your images. The welcome post shows you how.
- **Customise your theme** — Copy `themes/editorial/` to `site/themes/editorial/` and modify it freely. User themes in `site/themes/` take priority over built-in ones. See the [Theming Guide](./theming.md) for details.
- **Stay up to date** — Since `site/` isn't tracked in the repository, updating Obscura is just `git pull && npm install`. Your content is never affected.

## Project Structure

```
my-portfolio/
├── site/                  # ← YOUR site (created by npm run init)
│   ├── config/            #    Site settings
│   │   ├── site.yaml
│   │   └── galleries.yaml
│   ├── content/           #    Your content
│   │   ├── photos/        #    Photo galleries (images + sidecar YAML)
│   │   ├── posts/         #    Blog posts (Markdown)
│   │   └── pages/         #    Static pages (about, contact, homepage)
│   └── themes/            #    Your custom themes (override built-in ones)
├── themes/
│   └── editorial/         # Built-in default theme (updated by upstream)
├── src/                   # Obscura engine (TypeScript)
├── dist/                  # Generated site (gitignored)
└── .cache/                # Build cache (gitignored)
```

**What's yours:** `site/`. This directory is created by `npm run init` and is yours to edit day-to-day. It's not tracked in the upstream repo, so pulling updates will never cause merge conflicts on your content or custom themes.

**What's Obscura's:** `src/`, `examples/`, `themes/`, `package.json`, `docs/`. These are updated when you pull from upstream.

### A Note on Photos and Git

Original photo files (JPEG, PNG, TIFF, WebP) in `site/content/photos/` are **gitignored** to keep the repository small — a portfolio of 100 photos could easily exceed 2 GB. Everything else under `site/` — sidecar YAML files, config, posts, pages, custom themes — is *not* ignored and can be committed if you choose to (e.g., for CI deployment or managing your project as a fork).

This means:
- Your photos live on your local machine (back them up separately — cloud storage, NAS, external drive)
- A fresh clone of your repo won't have the images until you copy them back into `site/content/photos/`
- The build will warn about sidecars that reference missing images

## Optional: Fork Instead of Clone

If you'd like to version-control your content on GitHub — or contribute back to Obscura — you can fork the repository instead of cloning it directly:

1. Go to [github.com/jemayer/obscura](https://github.com/jemayer/obscura)
2. Click the **Fork** button (top-right corner)
3. On the "Create a new fork" page, choose your GitHub account as the owner
4. Optionally rename the repository (e.g. `my-portfolio`)
5. Click **Create fork**
6. Clone your fork instead:

```bash
git clone https://github.com/YOUR-USERNAME/obscura.git my-portfolio
cd my-portfolio
npm install
```

Add the original repo as an upstream remote to pull engine updates:

```bash
git remote add upstream https://github.com/jemayer/obscura.git
```

You now have two remotes:
- **origin** — your fork on GitHub (your content, your site)
- **upstream** — the original Obscura repo (engine updates, theme improvements)

When Obscura releases new features or bug fixes, pull them into your fork:

```bash
git fetch upstream
git merge upstream/main
npm install
npm run build:clean
```

Conflicts are rare because your content (`site/`) isn't tracked in the upstream repo at all — only engine code changes come through. Custom themes in `site/themes/` are also yours, so they won't conflict with upstream updates to built-in themes in `themes/`.

This is entirely optional. A plain clone works perfectly for most workflows.
