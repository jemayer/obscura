# ADR-008: Beans for Project Ticketing

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Obscura needs a way to track work — epics, tickets, status, and sequencing. The tracking system should:

- Live in the repository alongside the code (no external service)
- Be human-readable and editable
- Support a simple workflow (open → in progress → done)
- Be committable to git so that project history includes planning history

Alternatives considered:
- **GitHub Issues** — external to the repo, requires network access, not version-controlled with the code
- **Plain TODO.md** — no structure, no status tracking, doesn't scale
- **Linear/Jira** — external services, overkill for a solo/small-team project

## Decision

Use Beans, a file-based ticketing system that stores tickets as files in the repository.

## Consequences

- Tickets are Markdown files — readable, editable, diffable
- The full project plan is version-controlled alongside the code
- Commit messages reference ticket IDs, creating a traceable link between planning and implementation
- No external dependencies or accounts needed
- The trade-off is no UI for board views or filtering — but for a project of this size, file-based tracking is sufficient
