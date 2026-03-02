---
title: Welcome to Obscura
date: 2026-02-28
tags:
  - obscura
  - getting started
summary: Your photography portfolio is ready. Here's how to make it yours.
---

Welcome to **Obscura** — a static site generator built for photographers. This is a sample blog post to show you how everything works. You're looking at rendered Markdown with a photo shortcode embedded below.

## Photo Shortcodes

You can reference any photo from your galleries inside a blog post.

{{< photo "sample-01" >}}

The shortcode pulls in the photo as a styled card with its metadata. You can use either the bare filename slug (like above) or the full `gallery/photo` form.

## What's Next

1. Replace these sample photos with your own
2. Edit `config/site.yaml` to set your site title and URL
3. Create your galleries in `config/galleries.yaml`
4. Write blog posts in `content/posts/`
5. Run `npm run build` and deploy

Check out the [Getting Started guide](/about/) for more details. Happy shooting.
