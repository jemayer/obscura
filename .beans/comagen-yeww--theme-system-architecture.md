---
# comagen-yeww
title: Theme system architecture
status: todo
type: task
priority: high
created_at: 2026-02-27T21:56:50Z
updated_at: 2026-02-27T21:58:05Z
parent: comagen-zezk
blocking:
    - comagen-kd35
    - comagen-73b5
    - comagen-g39k
---

Implement the theme system: themes live in themes/<theme-name>/, active theme set in config/site.yaml. A theme contains templates (Nunjucks), CSS, and a manifest file declaring metadata. The build copies theme assets to dist/ and uses the theme's templates for rendering.
