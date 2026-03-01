# ADR-002: Nunjucks for Templating

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Obscura needs a templating engine to render HTML pages from structured data (photo metadata, gallery listings, blog posts, config values). The templates must support inheritance (base layout with child pages), includes (reusable partials like navigation and photo cards), loops, conditionals, and custom filters.

Alternatives considered:
- **EJS** — simple but no template inheritance, limited filter support
- **Handlebars** — logic-less philosophy makes complex layouts verbose
- **Pug** — whitespace-significant syntax is a barrier for non-developer contributors editing themes

## Decision

Use Nunjucks as the templating engine.

## Consequences

- Full template inheritance (`{% extends %}`, `{% block %}`) enables a clean base layout / child page pattern
- Includes and macros allow reusable components (photo cards, gallery grids, metadata tables)
- Custom filters can format dates, truncate text, and generate srcset strings
- Syntax is familiar to anyone who has used Jinja2 or Twig
- Nunjucks is mature but not heavily maintained — acceptable for a template engine with a stable feature set
