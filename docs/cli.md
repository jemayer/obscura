# CLI Reference

## Commands

### `npm run build`

Runs the full build pipeline:

1. Loads configuration (`config/site.yaml`, `config/galleries.yaml`)
2. Validates image formats
3. Generates sidecar YAML for photos without them
4. Reads EXIF data and merges with sidecars
5. Loads blog posts and resolves photo shortcodes
6. Loads pages
7. Processes images (resize, WebP conversion, thumbnails)
8. Renders all templates
9. Generates RSS feed and sitemap

Output goes to `dist/`.

**On success:**
```
comagen — building site…

✓ Built 42 pages, 28 photos in 1234ms
```

**With warnings** (e.g., missing EXIF data):
```
⚠ Warnings:

⚠ Missing or corrupt EXIF data in 3 photos:
  - content/photos/mono/old-scan.jpg (no date, no camera info)
  - content/photos/street/phone-snap.jpg (no lens info)
  Tip: fill in the missing fields in the corresponding sidecar YAML files.

✓ Built 42 pages, 28 photos in 1234ms
```

**On error** (hard errors abort the build):
```
✗ Build failed: Unsupported image format: content/photos/mono/sketch.psd
```

### `npm run dev`

Starts a local development server with file watching:

- Builds the site
- Serves `dist/` at http://localhost:3000
- Watches `content/`, `config/`, and `themes/` for changes
- Rebuilds automatically on file changes

Press `Ctrl+C` to stop.

### `npm run sidecar`

Interactive editor for filling in sidecar YAML metadata photo-by-photo, with terminal image previews.

After importing a batch of photos, their auto-generated sidecars have EXIF data (date, camera, lens) but leave `title`, `location`, `caption`, and `tags` empty. This tool walks you through each photo so you can fill in the missing fields without hand-editing YAML files.

**Workflow:**

1. **Gallery selection** — pick a gallery or edit across all galleries
2. **Filter** — edit all photos, or narrow to those missing a specific field (title, location, caption, or tags)
3. **Per-photo editing** — for each photo:
   - Displays an image preview in the terminal (requires iTerm2 or Kitty for best results; falls back gracefully in other terminals)
   - Shows read-only EXIF context (camera, date, lens)
   - Prompts for title, location, caption, and tags
   - Press Enter on any field to keep its current value
4. **Navigation** — after each photo, continue to the next or quit early

Changes are saved to disk immediately after each photo. Already-saved edits are preserved if you quit partway through.

**Example session:**

```
$ npm run sidecar

  comagen — sidecar editor

◆  Which gallery?
│  ● Sample Gallery (10 photos)
│  ○ All galleries (10 photos)
└

◆  Which photos?
│  ● All photos (10)
│  ○ Missing title (6)
│  ○ Missing location (8)
│  ○ Missing caption (9)
│  ○ Missing tags (7)
└

◇  Photo 1 of 6 — coma-photography-poly-00063.jpg
│
│  [image preview]
│
│  LEICA CAMERA AG LEICA Q2 · 2022-07-14

◆  Title (current: "")
│  Red Umbrella
└

◆  Location (current: "")
│  Baltic Sea, Germany
└

◆  Caption (current: "")
│  A lone figure with a red umbrella stands against the fog.
└

◆  Tags (comma-separated, current: none)
│  baltic sea, minimalistic, moody
└

✓  Saved coma-photography-poly-00063.yaml

◆  Next action?
│  ● Continue to next photo
│  ○ Quit
└
```

**Tips:**

- Run `npm run sidecar` right after importing new photos — the tool auto-generates any missing sidecar files before starting the edit loop
- Use the "Missing \<field\>" filters to focus on incomplete metadata
- Press `Ctrl+C` at any prompt to quit; already-saved photos are not affected

### `npm run validate`

Fast content validation without image processing. Checks:

- Config files parse correctly
- Theme exists and has a valid manifest
- All image formats are supported
- Gallery directories exist and photos are loadable
- Slug uniqueness holds
- Blog post shortcodes reference valid photos
- Pages parse correctly

Useful for quick feedback while writing content.

### `npm test`

Runs the test suite (Vitest).

### `npm run typecheck`

Type-checks TypeScript source without compiling.

### `npm run lint`

Runs ESLint on `src/`.

### `npm run format`

Formats source files with Prettier.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Unsupported image format` | Non-photo file in a gallery folder | Remove the file or move it elsewhere |
| `Photo not found: "slug"` | Shortcode references a photo that doesn't exist | Check the slug spelling and gallery name |
| `Ambiguous photo slug "slug"` | Same filename in multiple galleries | Use the full `gallery/photo` form |
| `Duplicate photo slug` | Two files with the same name in one gallery | Rename one of the files |
| `Theme "X" not found` | Theme name in `site.yaml` doesn't match a folder in `themes/` | Check the `theme` setting |
