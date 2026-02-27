---
# comagen-9g3w
title: Define core TypeScript types
status: todo
type: task
priority: high
created_at: 2026-02-27T21:55:32Z
updated_at: 2026-02-27T21:58:05Z
parent: comagen-qgnu
blocking:
    - comagen-ruz3
---

Define the core data types used throughout the pipeline: Photo (metadata, slug, gallery, file path, variants), Gallery (slug, title, description, listed flag), BlogPost (frontmatter, content, slug, referenced photos), Page (frontmatter, content, slug), SiteConfig, GalleryConfig. These types are the contract between pipeline stages.
