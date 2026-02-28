---
# comagen-ruz3
title: Create directory structure and config loading
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:32Z
updated_at: 2026-02-28T07:57:37Z
parent: comagen-qgnu
---

Create the canonical directory layout: config/, content/photos/, content/posts/, content/pages/, themes/, docs/. Implement config loading for config/site.yaml and config/galleries.yaml with TypeScript types. Include default config values.

## Summary of Changes

- Created canonical directory layout: config/, content/photos/post-assets/, content/posts/, content/pages/, themes/
- Added default config/site.yaml and config/galleries.yaml (with post-assets unlisted gallery)
- Implemented src/config.ts: loadSiteConfig() and loadGalleryConfig() with defaults for all fields
- Installed yaml package for YAML parsing, @types/node for Node.js types
- .gitkeep files in empty content directories
