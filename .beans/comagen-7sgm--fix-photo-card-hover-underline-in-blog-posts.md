---
# comagen-7sgm
title: Fix photo card hover underline in blog posts
status: completed
type: bug
priority: normal
created_at: 2026-02-28T20:50:25Z
updated_at: 2026-02-28T20:50:25Z
---

Photo cards embedded in blog posts via shortcodes show an unwanted underline/hover effect when hovered. The link styling from the blog prose context is leaking into the photo card. Fix by removing text-decoration and link styling on `.photo-card a`.
