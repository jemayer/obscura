---
# comagen-yeww
title: Theme system architecture
status: completed
type: task
priority: high
created_at: 2026-02-27T21:56:50Z
updated_at: 2026-02-28T09:01:38Z
parent: comagen-zezk
blocking:
    - comagen-kd35
    - comagen-73b5
    - comagen-g39k
---

Implement the theme system: themes live in themes/<theme-name>/, active theme set in config/site.yaml. A theme contains templates (Nunjucks), CSS, and a manifest file declaring metadata. The build copies theme assets to dist/ and uses the theme's templates for rendering.

## Summary of Changes

- Created src/theme.ts with:
  - ThemeManifest interface and validation
  - loadTheme(): loads theme from themes/<name>/, validates manifest.yaml
  - copyThemeAssets(): copies theme assets to dist/assets/theme/
  - Theme structure: templates/, assets/, manifest.yaml
- Created themes/editorial/ directory with manifest.yaml
- Removed themes/.gitkeep (replaced by actual theme content)
