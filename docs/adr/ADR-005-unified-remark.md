# ADR-005: unified/remark for Markdown Processing

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Obscura renders Markdown to HTML for blog posts and simple pages. Beyond basic Markdown, it needs:

- YAML frontmatter parsing
- A custom shortcode syntax (`{{< photo "slug" >}}`) that must be resolved against the content graph before rendering
- Clean, predictable HTML output for styling

Alternatives considered:
- **markdown-it** — fast and extensible via plugins, but plugin API is lower-level and less composable
- **marked** — minimal, fast, but limited extensibility for custom syntax

## Decision

Use the unified/remark ecosystem for all Markdown processing.

## Consequences

- AST-based pipeline (parse → transform → stringify) makes it straightforward to write a custom plugin that finds shortcode nodes and replaces them with photo card HTML
- remark-frontmatter + remark-parse handle YAML frontmatter extraction
- rehype (the HTML side of unified) gives precise control over the output HTML
- The ecosystem is modular — we pull in only what we need
- The AST approach is more verbose than string-replacement shortcode handling, but much more robust (no accidental matches inside code blocks, etc.)
