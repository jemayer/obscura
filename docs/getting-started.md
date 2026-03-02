# Getting Started

A step-by-step guide to setting up your photography portfolio with Obscura.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- A terminal (Terminal on macOS, Command Prompt or PowerShell on Windows)
- A [GitHub](https://github.com) account (for hosting and updates)
- Your photos (JPEG, PNG, TIFF, or WebP)

## Setup

### 1. Fork the Repository

Fork [Obscura on GitHub](https://github.com/jemayer/obscura) to create your own copy, then clone your fork:

```bash
git clone https://github.com/YOUR-USERNAME/obscura.git my-portfolio
cd my-portfolio
npm install
```

### 2. Add the Upstream Remote

This lets you pull code updates from the original Obscura repository later:

```bash
git remote add upstream https://github.com/jemayer/obscura.git
```

You now have two remotes:
- **origin** — your fork (your content, your site)
- **upstream** — the Obscura source (engine updates, theme improvements)

## Project Structure

```
my-portfolio/
├── config/                # ← Your site settings
│   ├── site.yaml
│   └── galleries.yaml
├── content/               # ← Your content
│   ├── photos/            #    Photo galleries (images + sidecar YAML)
│   ├── posts/             #    Blog posts (Markdown)
│   └── pages/             #    Static pages (about, contact, homepage)
├── themes/
│   └── editorial/         # Default theme
├── src/                   # Obscura engine (TypeScript)
├── dist/                  # Generated site (gitignored)
└── .cache/                # Build cache (gitignored)
```

**What's yours:** `config/`, `content/`, and any CSS tweaks in `themes/`. These are the files you'll edit day-to-day.

**What's Obscura's:** `src/`, `package.json`, `docs/`. These are updated when you pull from upstream.

### A Note on Photos and Git

Original photo files (JPEG, PNG, TIFF, WebP) in `content/photos/` are **gitignored** to keep the repository small — a portfolio of 100 photos could easily exceed 2 GB. The sidecar YAML files (titles, locations, captions) *are* committed, so your metadata library is always version-controlled.

This means:
- Your photos live on your local machine (back them up separately — cloud storage, NAS, external drive)
- A fresh clone of your repo won't have the images until you copy them back into `content/photos/`
- The build will warn about sidecars that reference missing images

## Configure Your Site

Edit `config/site.yaml`:

```yaml
base_url: https://your-domain.com
title: "Your Name — Photography"
theme: editorial
recent_shots_count: 12
images:
  breakpoints: [400, 800, 1200, 2400]
  webp_quality: 85
```

## Add Your First Gallery

1. Define the gallery in `config/galleries.yaml`:

```yaml
galleries:
  - slug: street
    title: Street Photography
    description: Moments from the city
    listed: true
```

2. Create a folder and add photos:

```bash
mkdir -p content/photos/street
cp ~/Pictures/street-photos/*.jpg content/photos/street/
```

3. Build the site — Obscura will auto-generate sidecar YAML files for each photo:

```bash
npm run build
```

4. Fill in titles, locations, and captions using the interactive sidecar editor:

```bash
npm run sidecar
```

The editor walks you through each photo with an image preview and prompts for each field. See the [CLI Reference](./cli.md#npm-run-sidecar) for details.

Alternatively, you can edit the generated sidecar files by hand (e.g., `content/photos/street/photo-name.yaml`):

```yaml
title: Morning Light
date: 2024-06-15
camera: Leica M10
location: Berlin, Germany
caption: Early morning in Kreuzberg
tags:
  - berlin
  - street
```

## Preview Your Site

```bash
npm run dev
```

Open http://localhost:3000 in your browser. The site rebuilds automatically when you change files.

## Build for Production

```bash
npm run build
```

The generated site is in `dist/`. Subsequent builds are faster because processed images are cached — only new or modified photos are re-processed. If you ever need a guaranteed-fresh build, use `npm run build:clean`.

## Pulling Upstream Updates

When Obscura releases new features or bug fixes, pull them into your fork:

```bash
git fetch upstream
git merge upstream/main
```

Conflicts are rare because your content (`config/`, `content/`) and the engine code (`src/`, `package.json`) live in separate directories. If you've customised theme CSS in `themes/`, you may occasionally need to resolve a merge conflict there — git will tell you.

After merging, install any new dependencies and rebuild:

```bash
npm install
npm run build:clean
```

## Next Steps

- [Content Model Reference](./content-model.md) — all the fields and options
- [CLI Reference](./cli.md) — build commands and options
- [Theming Guide](./theming.md) — customise the look
- [Deployment Guide](./deployment.md) — publish your site
