---
# comagen-shrt
title: Render photo shortcodes in blog posts
status: todo
type: bug
priority: high
created_at: 2026-02-28T16:00:00Z
updated_at: 2026-02-28T16:00:00Z
---

Photo shortcodes (`{{< photo "slug" >}}`) in blog posts are extracted and validated but never replaced with actual HTML. The shortcode text passes through the Markdown renderer as literal text and is not visible in the rendered post.

Fix: after Markdown rendering, replace each shortcode occurrence in the rendered HTML with a photo card (`<div class="photo-card">...</div>`) containing the responsive image, title, and metadata. This requires passing the resolved photo data into the rendering stage.
