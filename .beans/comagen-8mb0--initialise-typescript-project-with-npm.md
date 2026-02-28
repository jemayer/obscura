---
# comagen-8mb0
title: Initialise TypeScript project with npm
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:32Z
updated_at: 2026-02-28T07:54:45Z
parent: comagen-qgnu
blocking:
    - comagen-9g3w
    - comagen-3imu
    - comagen-4kq7
    - comagen-qajl
---

Set up package.json, tsconfig.json (strict mode, no any), install TypeScript. Create src/ directory structure. Configure build to compile to dist-build/ (not dist/ which is the site output).

## Summary of Changes

- Initialised npm project (ESM, v0.1.0)
- Installed TypeScript 5.9 with strict config (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, no any)
- tsconfig compiles src/ to dist-build/ (separate from dist/ site output)
- Added npm scripts: typecheck, compile
- Placeholder scripts for build, dev, test (to be implemented in later tickets)
- Created src/index.ts entry point
