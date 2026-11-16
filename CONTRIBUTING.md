# Contributing to Obscura

Thanks for wanting to make Obscura better! Bug reports, fixes, and improvements are all welcome. This guide covers what you need to know to get a pull request merged without a lot of back-and-forth.

## Before You Start

- **Small fixes** (typos, obvious bugs, small improvements) — just open a pull request.
- **Bigger changes** (new features, new dependencies, changes to how the build pipeline or content model works) — please [open an issue](https://github.com/jemayer/obscura/issues) first so we can agree on the approach before you invest the time.
- **One topic per pull request.** Unrelated changes (e.g. a bug fix plus a reformat of other files) are much harder to review — split them up.

## Setup

You'll need [Node.js](https://nodejs.org/) 20 or later.

```bash
git clone https://github.com/<your-username>/obscura.git
cd obscura
npm install
npm run init    # scaffold an example site in site/
npm run dev     # build and preview at localhost:3000
```

`site/` is user content and is not tracked in the repository — don't commit it. See [Getting Started](docs/getting-started.md) for the full walkthrough.

## Before Opening a Pull Request

Run all four checks and make sure they pass:

```bash
npm run typecheck
npm run lint
npm run format:check   # or `npm run format` to fix
npm test
```

`lint` and `format` only cover `src/`, but please follow the same style in `test/` as well.

## Code Conventions

- **TypeScript strict mode, no `any`.** Both the compiler and ESLint enforce this. Use `unknown` and narrow it.
- **ES modules.** Use `.js` extensions in relative imports (`import { foo } from './bar.js'`).
- **Readonly data.** Interfaces use `readonly` properties; data flows forward through the pipeline and is never mutated in place.
- **Formatting is Prettier's job** — single quotes, trailing commas, 80 columns (see `.prettierrc`). Don't hand-format, and don't reformat code you didn't otherwise change.
- **Match the surrounding code** in naming, comment density, and structure.
- **Core types live in `src/types.ts`.** They're the contract between pipeline stages — change them deliberately. See `CLAUDE.md` for an overview of the build pipeline.

### Error Policy

Obscura distinguishes between problems that must stop the build and problems a photographer can fix later:

- **Hard error (build fails):** missing or ambiguous photo shortcodes, unsupported image formats.
- **Warn and continue:** missing or corrupt EXIF data — the user can fill in the sidecar YAML.

New code should fit into one of these categories. Never fail silently: if data is dropped or broken, the user should see a warning.

## Tests

A change isn't done until it's tested. Tests use [Vitest](https://vitest.dev/) and live in `test/`.

- **Bug fixes** should include a test that fails without the fix.
- **New behaviour** needs tests covering it, including edge cases and the error paths.
- **Prefer generated fixtures.** Where possible, create test images on the fly with `sharp` (see `test/exif.test.ts`) instead of committing binary files.
- **Committed fixtures** go in `test/fixtures/`. Keep them tiny, and add a `README.md` next to them documenting where each one comes from and its license. Only use material you're allowed to redistribute, e.g. your own work or CC0.

## Documentation

Docs are part of the change, not a follow-up. If your pull request changes behaviour, configuration, or commands, update the relevant files in the same PR:

- `docs/` — user documentation (getting started, content model, theming, CLI, deployment)
- `CHANGELOG.md` — add an entry under **Unreleased**
- `README.md` — if a feature list or quick start is affected

### Architecture Decision Records

Significant technical choices — a new dependency, a new pipeline stage, a change in how data is interpreted — are recorded as ADRs in [`docs/adr/`](docs/adr/). If your change makes such a choice, add a **new** ADR (next free number, same structure as the existing ones) rather than rewriting an old one. If it supersedes an earlier decision, say so in both. When in doubt, ask in the issue.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

For example: `fix(exif): read metadata from WebP containers` or `docs(cli): document the --clean flag`.

Common types are `feat`, `fix`, `docs`, `test`, `refactor`, `style`, and `chore`. The scope is usually the module or area you touched (`exif`, `images`, `recover`, `theme`, …).

Maintainers also append an internal ticket ID (e.g. `[obscura-4z74]`) — you don't need to do that.

## License

Obscura is [MIT licensed](LICENSE). By contributing, you agree that your contributions are licensed under the same terms.
