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
