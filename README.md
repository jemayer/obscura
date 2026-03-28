# Obscura

**A static site generator built for photographers only.**

*Less webpack, more f-stop.* Drop your photos into folders, write in Markdown, invoke `npm run build` — and get a fast, beautiful portfolio site.

[Project Homepage](https://obscura.md)

![Screenshot of an example Obscura site](/docs/assets/demo-site-01.jpg)

## Why Obscura?

Most static site generators are built for developers. Obscura is built for photographers. No plugins to install, no wild frontmatter gymnastics: you are not fighting that generic tool into doing what you need. The entire design — from the image pipeline to the content model — serves a single use case: **publishing your photography on the web.**

Keep your photos in folders, organised by gallery. Obscura reads EXIF data from your images, generates responsive WebP variants at multiple breakpoints, builds a gallery with a full-screen lightbox viewer, and produces plain static files you can host anywhere.

Your content lives in Markdown and YAML. Your site belongs to you.

## Features

- **Automatic image processing** — resizes at configurable breakpoints, converts to WebP, generates thumbnails and `srcset` for responsive loading. Powered by [sharp](https://sharp.pixelplumbing.com/).
- **EXIF extraction** — camera, lens, date, GPS coordinates pulled straight from your files. No manual data entry required.
- **Sidecar metadata** — auto-generated YAML sidecars let you add titles, locations, captions, and tags. An interactive CLI editor (`npm run sidecar`) walks you through each photo.
- **Photo shortcodes in blog posts** — embed any photo in a blog post with `{{< photo "gallery/shot" >}}`. Renders as a styled card with metadata. Cross-references link back from photos to the posts that feature them.
- **Gallery browsing with lightbox** — [PhotoSwipe](https://photoswipe.com/)-powered full-screen viewer with keyboard and swipe navigation.
- **Theming** — ships with `editorial`, a polished theme with automatic dark mode. CSS custom properties make it easy to customise or build your own.
- **Incremental builds** — processed images are cached. Only new or changed photos are re-processed on subsequent builds.
- **Watch mode** — `npm run dev` rebuilds on every file change with a local preview server.
- **Blog posts and pages** — A markdown blog with tags and RSS feed, plus simple pages for About, Contact, and anything else.
- **Plain static output** — no JavaScript frameworks, no backend required. Deploy to GitHub Pages, Netlify, Cloudflare Pages, or your own server.

## Quick Start

```bash
git clone https://github.com/jemayer/obscura.git my-portfolio
cd my-portfolio
npm install
npm run init    # scaffold example site
npm run dev     # build and preview at localhost:3000
```

Add your photos to `site/content/photos/<gallery>/`, declare galleries in `site/config/galleries.yaml`, and build. That's it.

See the **[Getting Started guide](docs/getting-started.md)** for the full walkthrough.

![Screenshot of CLI sidecar editor](/docs/assets/sidecar.png)

## Project Structure

```
my-portfolio/
├── site/                  # YOUR content (created by npm run init)
│   ├── config/            #   site.yaml, galleries.yaml
│   ├── content/
│   │   ├── photos/        #   Photo galleries (images + sidecar YAML)
│   │   ├── posts/         #   Blog posts (Markdown)
│   │   └── pages/         #   Static pages (About, Contact, etc.)
│   └── themes/            #   Custom theme overrides
├── themes/editorial/      # Built-in default theme
├── src/                   # Obscura engine (TypeScript)
├── dist/                  # Generated site output (gitignored)
└── docs/                  # Documentation
```

Everything under `site/` is yours. Everything else is Obscura's engine — pull updates without touching your content.

## Documentation

- **[Getting Started](docs/getting-started.md)** — install, first build, adding photos
- **[Content Model](docs/content-model.md)** — photos, galleries, posts, pages
- **[Theming](docs/theming.md)** — customising the look of your site
- **[Deployment](docs/deployment.md)** — GitHub Pages, Netlify, Cloudflare Pages, rsync
- **[CLI Reference](docs/cli.md)** — all commands and flags
- **[Product Requirements](docs/product/PRD.md)** — full spec and design decisions

## License

[MIT](LICENSE)
