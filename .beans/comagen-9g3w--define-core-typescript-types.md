---
# comagen-9g3w
title: Define core TypeScript types
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:32Z
updated_at: 2026-02-28T07:56:40Z
parent: comagen-qgnu
blocking:
    - comagen-ruz3
---

Define the core data types used throughout the pipeline: Photo (metadata, slug, gallery, file path, variants), Gallery (slug, title, description, listed flag), BlogPost (frontmatter, content, slug, referenced photos), Page (frontmatter, content, slug), SiteConfig, GalleryConfig. These types are the contract between pipeline stages.

## Summary of Changes

- Created src/types.ts with all core types
- SiteConfig, ImageConfig, GalleryConfig, GalleryEntry
- ExifData, PhotoMetadata, ImageVariant, Photo
- Gallery (assembled with photos)
- BlogPostFrontmatter, BlogPost (with referencedPhotos slugs)
- PageFrontmatter, Page
- CrossReferenceGraph (bidirectional photo↔post maps)
- BuildContext (full assembled data for rendering stage)
- All interfaces use readonly properties
