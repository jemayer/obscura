---
title: Welcome to comagen
date: 2024-09-01
tags:
  - comagen
  - getting started
summary: Your photography portfolio is ready. Here's how to make it yours.
---

Welcome to **comagen** — a static site generator built for photographers.

This is a sample blog post to show you how everything works. You're looking at rendered Markdown with a photo shortcode embedded below.

## Photo Shortcodes

You can reference any photo from your galleries inside a blog post. Here's the red umbrella shot from the sample gallery:

{{< photo "coma-photography-poly-00061" >}}

The shortcode pulls in the photo as a styled card with its metadata. You can use either the bare filename slug (like above) or the full `gallery/photo` form:

```
{{< photo "sample/coma-photography-poly-00061" >}}
```

## What's Next

1. Replace these sample photos with your own
2. Edit `config/site.yaml` to set your site title and URL
3. Create your galleries in `config/galleries.yaml`
4. Write blog posts in `content/posts/`
5. Run `npm run build` and deploy

Check out the [Getting Started guide](/about/) for more details. Happy shooting.
