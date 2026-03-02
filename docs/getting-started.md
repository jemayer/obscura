# Getting Started

A step-by-step guide to setting up your photography portfolio with Obscura.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- A terminal (Terminal on macOS, Command Prompt or PowerShell on Windows)
- Your photos (JPEG, PNG, TIFF, or WebP)

## Installation

```bash
git clone https://github.com/jcm/obscura.git my-portfolio
cd my-portfolio
npm install
```

## Project Structure

```
my-portfolio/
├── config/
│   ├── site.yaml         # Site settings (title, URL, etc.)
│   └── galleries.yaml    # Gallery definitions
├── content/
│   ├── photos/           # Your photo galleries
│   │   └── <gallery>/    # One folder per gallery
│   ├── posts/            # Blog posts (Markdown)
│   └── pages/            # Static pages (about, contact)
├── themes/
│   └── editorial/        # Default theme
├── dist/                 # Generated site (after build)
└── .cache/               # Build cache (auto-created, gitignored)
```

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

The generated site is in `dist/`. Upload its contents to any static hosting provider. Subsequent builds are faster because processed images are cached — only new or modified photos are re-processed. If you ever need a guaranteed-fresh build, use `npm run build:clean`.

## Next Steps

- [Content Model Reference](./content-model.md) — all the fields and options
- [CLI Reference](./cli.md) — build commands and options
- [Theming Guide](./theming.md) — customise the look
- [Deployment Guide](./deployment.md) — publish your site
