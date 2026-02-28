---
# comagen-4kq7
title: Set up ESLint and Prettier
status: completed
type: task
priority: high
created_at: 2026-02-27T22:03:47Z
updated_at: 2026-02-28T07:59:59Z
parent: comagen-qgnu
---

Install and configure ESLint with @typescript-eslint and Prettier. Key: @typescript-eslint/no-explicit-any set to error. Add npm run lint and npm run format scripts. Per ADR-012.

## Summary of Changes

- Installed eslint, @eslint/js, typescript-eslint, prettier
- Created eslint.config.js with strictTypeChecked config and no-explicit-any error
- Created .prettierrc (single quotes, trailing commas, 80 char width)
- Added npm scripts: lint, format, format:check
- Fixed existing config.ts to pass strict linting (proper type guards instead of unsafe as casts)
