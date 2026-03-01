# ADR-001: TypeScript as Implementation Language

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Obscura is a Node.js CLI tool with a non-trivial data pipeline: EXIF extraction, YAML parsing, Markdown rendering, shortcode resolution, cross-reference graph building, and image processing. Bugs in any stage can produce subtle, hard-to-diagnose output errors (wrong metadata on a photo page, broken back-links, missing image variants).

We need a language that catches as many of these errors as possible at compile time rather than at runtime or — worse — in production.

## Decision

Use TypeScript in strict mode with `no any` enforced. All data structures flowing through the pipeline (photo metadata, gallery config, shortcode references, the cross-reference graph) are explicitly typed.

## Consequences

- Type errors in the content pipeline are caught before any build runs
- Strict mode eliminates implicit `any`, forcing us to model the data correctly
- IDE support (autocompletion, inline errors) speeds up development
- Adds a compilation step, but this is negligible compared to image processing time
- All contributors must write TypeScript — no escape hatch to plain JS
