---
# obscura-y3j4
title: Rewrite getting-started and deployment docs for fork-and-update workflow
status: completed
type: task
priority: normal
created_at: 2026-03-02T20:59:58Z
updated_at: 2026-03-02T21:01:19Z
---

The current docs have gaps around the real-world usage workflow:

1. Getting started says "git clone" but does not explain how to set up your own repo while staying updatable from upstream
2. Deployment guide has a GitHub Actions workflow that cannot work because photos are gitignored (ADR-011)
3. No guidance on the fork-and-pull-upstream pattern for receiving code updates

Rewrite both docs to clearly explain:
- [x] Fork-based setup with upstream remote for pulling code updates
- [x] Which directories are "yours" vs "engine code"
- [x] How photo gitignoring affects deployment (build locally, push dist/)
- [x] Fix the GitHub Actions section (local build + gh-pages, or note the LFS/external storage requirement for CI)
- [x] Clear workflow for receiving upstream updates and resolving conflicts

## Summary of Changes

Rewrote getting-started.md and deployment.md to cover the real-world fork-and-update workflow, explain photo gitignoring implications for deployment, and fix the broken GitHub Actions example.
