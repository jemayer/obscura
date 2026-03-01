# Content Model Reference

## Photos and Sidecar Files

Each photo in a gallery can have a companion YAML sidecar file with the same name (e.g., `sunset.jpg` → `sunset.yaml`).

### Sidecar Fields

| Field      | Type     | Description                           |
|-----------|----------|---------------------------------------|
| `title`    | string   | Display title for the photo           |
| `date`     | date     | Date the photo was taken (overrides EXIF) |
| `camera`   | string   | Camera used (overrides EXIF)          |
| `lens`     | string   | Lens used (overrides EXIF)            |
| `location` | string   | Where the photo was taken             |
| `caption`  | string   | Description or story behind the photo |
| `gps_lat`  | number   | GPS latitude (overrides EXIF)         |
| `gps_lon`  | number   | GPS longitude (overrides EXIF)        |
| `tags`     | string[] | Tags for categorisation               |

Sidecar values always win over EXIF data when both are present. Empty sidecar fields do not override EXIF values.

### Auto-Generated Sidecars

When you run `npm run build`, comagen creates sidecar files for any photo that doesn't have one yet. These are pre-filled with EXIF data (date, camera, lens) so you only need to add titles, locations, and captions.

Use `npm run sidecar` to fill in missing fields interactively with terminal image previews, or edit the YAML files by hand. See the [CLI Reference](./cli.md#npm-run-sidecar) for details.

### Supported Image Formats

JPEG (`.jpg`, `.jpeg`), PNG (`.png`), TIFF (`.tif`, `.tiff`), WebP (`.webp`).

Any other format in a gallery folder causes a build error.

## Gallery Configuration

Defined in `config/galleries.yaml`:

```yaml
galleries:
  - slug: street
    title: Street Photography
    description: Moments from the city   # optional
    listed: true                          # show on gallery index

  - slug: post-assets
    title: Post Assets
    listed: false                         # hidden from gallery index
```

- **slug**: URL-safe identifier, must match the folder name under `content/photos/`
- **listed**: Set to `false` for galleries that should not appear on the gallery index (useful for photos used only in blog posts)

## Blog Posts

Markdown files in `content/posts/`. The filename (without `.md`) becomes the URL slug.

### Frontmatter

```yaml
---
title: My First Post
date: 2024-06-20
tags:
  - travel
  - berlin
summary: A short description for the blog index
---
```

| Field     | Type     | Required | Description                           |
|----------|----------|----------|---------------------------------------|
| `title`   | string   | yes      | Post title                            |
| `date`    | date     | yes      | Publication date                      |
| `tags`    | string[] | yes      | Tags (can be empty `[]`)              |
| `summary` | string   | no       | Shown on blog index and RSS feed      |

### Photo Shortcode

Reference photos from any gallery inside your posts:

```markdown
Check out this photo from Berlin:

{{< photo "street/morning-light" >}}

Or use a bare slug (if the photo name is unique across all galleries):

{{< photo "morning-light" >}}
```

The shortcode renders as a styled photo card with the image and metadata.

**Bare slugs** work only when the photo name is unique across all galleries. If the same filename exists in multiple galleries, you must use the full `gallery/photo` form. An ambiguous or non-existent slug causes a build error.

## Pages

Markdown files in `content/pages/`. Each file becomes a top-level page (e.g., `about.md` → `/about/`).

### Frontmatter

```yaml
---
title: About
---
```

| Field   | Type   | Required | Description |
|--------|--------|----------|-------------|
| `title` | string | yes      | Page title  |

The rest of the file is Markdown content rendered within the site layout.
