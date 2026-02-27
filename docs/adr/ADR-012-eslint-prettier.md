# ADR-012: ESLint and Prettier for Linting and Formatting

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

comagen enforces strict TypeScript (no `any`, ever). But TypeScript's compiler only catches type errors — it doesn't enforce code style, catch common anti-patterns, or ensure consistent formatting across files and contributors.

Without automated linting and formatting, code style becomes a manual concern that erodes over time, especially when AI assistants are generating code.

## Decision

Use ESLint with `@typescript-eslint` for linting and Prettier for formatting. Configure them as part of the project scaffolding, before any application code is written.

Key rules:
- `@typescript-eslint/no-explicit-any` set to error (enforces the "no `any`" policy at the lint level, not just tsconfig)
- Prettier handles all formatting — no ESLint formatting rules
- `npm run lint` runs ESLint, `npm run format` runs Prettier

## Consequences

- Code style is enforced automatically, not by convention
- The "no `any`" policy is enforced by both tsconfig and ESLint (belt and braces)
- Contributors (human or AI) get immediate feedback on style violations
- Adds two dev dependencies and two config files — minimal overhead
- All code is formatted consistently from the first line
