# Getting Started

A step-by-step guide to setting up your photography portfolio with comagen.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- A terminal (Terminal on macOS, Command Prompt or PowerShell on Windows)
- Your photos (JPEG, PNG, TIFF, or WebP)

## Installation

```bash
git clone https://github.com/comagen/comagen.git my-portfolio
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
└── dist/                 # Generated site (after build)
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

3. Build the site — comagen will auto-generate sidecar YAML files for each photo:

```bash
npm run build
```

4. Edit the generated sidecar files (e.g., `content/photos/street/photo-name.yaml`) to add titles, locations, and captions:

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

The generated site is in `dist/`. Upload its contents to any static hosting provider.

## Next Steps

- [Content Model Reference](./content-model.md) — all the fields and options
- [CLI Reference](./cli.md) — build commands and options
- [Theming Guide](./theming.md) — customise the look
- [Deployment Guide](./deployment.md) — publish your site
