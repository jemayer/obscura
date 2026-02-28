---
# comagen-22e0
title: Homepage intro content from index.md
status: completed
type: feature
priority: normal
created_at: 2026-02-28T20:43:08Z
updated_at: 2026-02-28T20:43:08Z
---

Support an optional `content/pages/index.md` file whose rendered Markdown content appears above the photo grid on the homepage.

- In the content loading stage, check if `content/pages/index.md` exists. If so, parse it as Markdown and pass the rendered HTML to the homepage template as `homepage_content`.
- The homepage template renders `homepage_content` above the "Recent Shots" section when present.
- If `index.md` does not exist, the homepage renders exactly as before (photo grid only).
- The `index.md` page should be excluded from the regular pages list so it doesn't also generate `/index/index.html`.
