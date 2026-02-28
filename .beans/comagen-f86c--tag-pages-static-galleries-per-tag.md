---
# comagen-f86c
title: Tag pages — static galleries per tag
status: completed
type: feature
priority: normal
created_at: 2026-02-28T21:03:51Z
updated_at: 2026-02-28T21:03:51Z
---

Generate a page for each unique tag at /tags/<tag-slug>/ that lists all photos with that tag across all galleries. Also generate a tag index at /tags/ listing all tags.

- Collect all unique tags from photo metadata across all galleries
- Generate a tag slug for each (lowercase, hyphenated)
- Render a grid page per tag showing all matching photos
- Render an index page listing all tags with photo counts
- Make tags on the photo detail page link to their tag page
