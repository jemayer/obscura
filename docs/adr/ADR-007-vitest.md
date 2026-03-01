# ADR-007: Vitest for Testing

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Obscura requires both unit tests (EXIF reading, slug generation, shortcode parsing, etc.) and integration tests (full build pipeline, correct output files). The test framework must:

- Support TypeScript natively (no separate compilation step)
- Be fast — the test suite will grow as features are added
- Have a familiar API
- Support file system assertions for integration tests

Alternatives considered:
- **Jest** — widely used but slower with TypeScript (requires ts-jest or SWC transformer), heavier configuration
- **Node.js built-in test runner** — lightweight but immature ecosystem, limited assertion library

## Decision

Use Vitest as the test framework.

## Consequences

- Native TypeScript and ESM support — no configuration needed for TS files
- Fast execution via Vite's transformation pipeline
- Jest-compatible API (`describe`, `it`, `expect`) — familiar to most JS/TS developers
- Watch mode for development
- Built-in code coverage reporting
- Lightweight setup — a single `vitest.config.ts` is all that's needed
