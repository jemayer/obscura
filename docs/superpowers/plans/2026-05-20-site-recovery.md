# Site Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `npm run recover -- <url> [target-dir] [--force]`, a CLI that reconstructs an editable Obscura project from the URL of a deployed Obscura site.

**Architecture:** A pipeline of well-bounded stages: identify the site via its `<meta name="generator">` tag → enumerate URLs from `/sitemap.xml` → fetch each page and run a typed parser (parsers are pure: HTML → typed value + warnings, no I/O) → download the largest srcset variant of every photo → write `site/config/`, sidecar YAMLs, posts, pages, and a `recovery-report.md`. Each stage produces fully formed output before the next runs.

**Tech Stack:** TypeScript (ESM, strict), Node 24+, `cheerio` (DOM), `turndown` (HTML→Markdown), `yaml` (already in project), `node:http` for the in-process test server, Vitest.

**Tracking beans:**
- `obscura-0kv8` — this feature (implementation)
- `obscura-0p2f` — follow-up: link-crawl fallback when `sitemap.xml` is missing (out of scope)

**Reference spec:** `docs/superpowers/specs/2026-05-20-site-recovery-design.md`
**Related ADR:** `docs/adr/ADR-015-generator-meta-marker.md`

---

## File Structure

### New files

- `src/recover.ts` — entry module, orchestrates stages, prints progress, exit codes
- `src/recover/types.ts` — recovery-specific result types (`Identified`, `EnumeratedUrls`, parser outputs, warning records)
- `src/recover/fetch.ts` — same-origin HTTP client with concurrency cap + polite delay + retry/backoff
- `src/recover/identify.ts` — reads generator meta, returns theme/version with fallbacks
- `src/recover/sitemap.ts` — fetches and parses `/sitemap.xml`, categorises URLs
- `src/recover/parse-site.ts` — homepage → `SiteConfig` (partial)
- `src/recover/parse-gallery.ts` — gallery index → `GalleryEntry`
- `src/recover/parse-photo.ts` — photo detail page → `PhotoMetadata` + selected variant URL
- `src/recover/parse-post.ts` — blog post → frontmatter + Markdown + photo refs
- `src/recover/parse-page.ts` — generic page → frontmatter + Markdown
- `src/recover/download-image.ts` — fetch a binary, write to disk
- `src/recover/write.ts` — assemble + serialise everything to the target directory
- `src/recover/report.ts` — produce `recovery-report.md`
- `test/recover/identify.test.ts`
- `test/recover/sitemap.test.ts`
- `test/recover/parse-photo.test.ts`
- `test/recover/parse-gallery.test.ts`
- `test/recover/parse-site.test.ts`
- `test/recover/parse-post.test.ts`
- `test/recover/parse-page.test.ts`
- `test/recover/roundtrip.test.ts`
- `test/recover/fixtures/` — HTML fixtures used by parser tests

### Modified files

- `themes/editorial/templates/base.html:8` — extend generator meta with `data-theme` and `data-version`
- `src/rendering.ts:55-71` — expose `obscura_version` template global (read from `package.json`)
- `src/cli.ts` — not modified; `npm run recover` invokes `dist-build/recover.js` directly (matches `init` / `migrate` pattern)
- `package.json:scripts` — add `"recover": "tsc && node dist-build/recover.js"`
- `package.json:dependencies` — add `cheerio` and `turndown`; `package.json:devDependencies` — add `@types/turndown`
- `README.md` — add "I lost my local setup" troubleshooting section
- `docs/cli.md` — document `npm run recover`

---

## Task 1: Expose `obscura_version` template global

**Files:**
- Modify: `src/rendering.ts:55-71`
- Test: `test/recover/rendering-globals.test.ts` (new, small)

- [ ] **Step 1: Write the failing test**

Create `test/recover/rendering-globals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRenderingEngine } from '../../src/rendering.js';
import { resolve } from 'node:path';
import type { SiteConfig } from '../../src/types.js';
import { readFileSync } from 'node:fs';

const themeDir = resolve(import.meta.dirname, '..', '..', 'themes', 'editorial', 'templates');

const minimalSiteConfig: SiteConfig = {
  base_url: 'https://example.com',
  base_path: '',
  title: 'Test',
  theme: 'editorial',
  recent_shots_count: 10,
  images: { breakpoints: [400, 800, 1200, 2400], webp_quality: 85 },
  license: 'all-rights-reserved',
  gallery_default_layout: 'masonry',
  social_links: [],
  photo_display_fields: ['date', 'camera'],
  lightbox_display_fields: ['date'],
};

describe('rendering globals', () => {
  it('exposes obscura_version matching package.json', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8'),
    ) as { version: string };
    const engine = createRenderingEngine(themeDir, minimalSiteConfig);
    const rendered = engine.env.renderString('{{ obscura_version }}', {});
    expect(rendered).toBe(pkg.version);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```
npm test -- test/recover/rendering-globals.test.ts
```

Expected: FAIL — `obscura_version` is undefined (renders as empty string), test asserts it equals the package version.

- [ ] **Step 3: Implement**

In `src/rendering.ts`, after the `build_timestamp` block (~line 71), add:

```ts
  // Obscura version — read from package.json at startup. Used by the
  // recovery tool to negotiate parsing compatibility (see ADR-015).
  const pkgPath = resolve(import.meta.dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
  env.addGlobal('obscura_version', pkg.version);
```

Add the two imports at the top of `src/rendering.ts` if missing:

```ts
import { readFileSync } from 'node:fs';
// `resolve` is already imported
```

Note: `import.meta.dirname` resolves to `dist-build/` at runtime, so `..` reaches the project root where `package.json` lives.

- [ ] **Step 4: Run test, verify it passes**

```
npm test -- test/recover/rendering-globals.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rendering.ts test/recover/rendering-globals.test.ts
git commit -m "feat(rendering): expose obscura_version template global [obscura-0kv8]"
```

---

## Task 2: Extend the generator meta tag in the editorial theme

**Files:**
- Modify: `themes/editorial/templates/base.html:8`
- Test: `test/recover/generator-meta.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `test/recover/generator-meta.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { cp, rm, readFile, symlink } from 'node:fs/promises';
import { build } from '../../src/build.js';

const FIXTURE_DIR = resolve(import.meta.dirname, '..', 'fixtures', 'site');
const WORK_DIR = resolve(import.meta.dirname, '..', 'fixtures', 'site-work-gen');
const THEME_SRC = resolve(import.meta.dirname, '..', '..', 'themes', 'editorial');

describe('generator meta tag', () => {
  beforeAll(async () => {
    await rm(WORK_DIR, { recursive: true, force: true });
    await cp(FIXTURE_DIR, WORK_DIR, { recursive: true });
    await symlink(THEME_SRC, resolve(WORK_DIR, 'themes', 'editorial'));
    await build(WORK_DIR);
  });

  afterAll(async () => {
    await rm(WORK_DIR, { recursive: true, force: true });
  });

  it('renders content, data-theme, and data-version on every page', async () => {
    const html = await readFile(resolve(WORK_DIR, 'dist', 'index.html'), 'utf-8');
    expect(html).toMatch(/<meta name="generator"[^>]*content="Obscura \d{8}-\d{2}:\d{2}:\d{2}"/);
    expect(html).toMatch(/data-theme="editorial"/);
    expect(html).toMatch(/data-version="\d+\.\d+\.\d+"/);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```
npm test -- test/recover/generator-meta.test.ts
```

Expected: FAIL — current template only emits `content`, no `data-*` attributes.

- [ ] **Step 3: Implement**

Replace line 8 of `themes/editorial/templates/base.html`:

```html
  <meta name="generator" content="Obscura {{ build_timestamp }}" data-theme="{{ site.theme }}" data-version="{{ obscura_version }}">
```

- [ ] **Step 4: Run test, verify it passes**

```
npm test -- test/recover/generator-meta.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add themes/editorial/templates/base.html test/recover/generator-meta.test.ts
git commit -m "feat(theme): enrich generator meta with data-theme and data-version [obscura-0kv8]"
```

---

## Task 3: Add `cheerio` and `turndown` dependencies

**Files:**
- Modify: `package.json:dependencies`, `package.json:devDependencies`

- [ ] **Step 1: Install**

```bash
npm install cheerio turndown
npm install --save-dev @types/turndown
```

- [ ] **Step 2: Verify typecheck still passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add cheerio and turndown for site recovery [obscura-0kv8]"
```

---

## Task 4: Recovery types module

**Files:**
- Create: `src/recover/types.ts`

- [ ] **Step 1: Create the types module**

Create `src/recover/types.ts`:

```ts
import type {
  SiteConfig,
  GalleryEntry,
  PhotoMetadata,
  BlogPostFrontmatter,
  PageFrontmatter,
} from '../types.js';

/** A warning generated by any parser. Aggregated into recovery-report.md. */
export interface RecoveryWarning {
  readonly category:
    | 'identify'
    | 'site'
    | 'gallery'
    | 'photo'
    | 'post'
    | 'page'
    | 'image'
    | 'sitemap';
  readonly subject: string;
  readonly message: string;
}

/** Output of the identify stage. */
export interface Identified {
  /** Theme name. Defaults to 'editorial' when data-theme is absent. */
  readonly theme: string;
  /** Obscura version that built the upstream site, or null when data-version is absent. */
  readonly version: string | null;
  /** Build timestamp from the content attribute, or null if unparseable. */
  readonly buildTimestamp: string | null;
  /** True when fallbacks were applied. */
  readonly usedFallback: boolean;
  readonly warnings: readonly RecoveryWarning[];
}

/** Output of the sitemap enumeration stage. */
export interface EnumeratedUrls {
  readonly homepage: string;
  readonly galleryIndex: string | null;
  readonly galleries: readonly string[];
  readonly photos: readonly string[];
  readonly posts: readonly string[];
  readonly pages: readonly string[];
}

/** Subset of SiteConfig recoverable from a homepage. Everything optional. */
export type RecoveredSiteConfig = Partial<SiteConfig> & {
  readonly theme: string;
  readonly base_url: string;
  readonly title: string;
};

export interface ParseResult<T> {
  readonly value: T;
  readonly warnings: readonly RecoveryWarning[];
}

export interface ParsedPhoto {
  readonly gallerySlug: string;
  readonly photoSlug: string;
  readonly metadata: Partial<PhotoMetadata>;
  /** Absolute URL of the largest image variant available, or null if none. */
  readonly imageUrl: string | null;
  /** File extension derived from imageUrl, e.g. ".jpg". */
  readonly imageExt: string | null;
}

export interface ParsedGallery {
  readonly entry: GalleryEntry;
}

export interface ParsedPost {
  readonly slug: string;
  readonly frontmatter: Partial<BlogPostFrontmatter>;
  readonly markdownBody: string;
  /** True if Turndown threw; markdownBody will be empty and rawHtml will be set. */
  readonly conversionFailed: boolean;
  readonly rawHtml?: string;
}

export interface ParsedPage {
  readonly slug: string;
  readonly frontmatter: Partial<PageFrontmatter>;
  readonly markdownBody: string;
  readonly conversionFailed: boolean;
  readonly rawHtml?: string;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/recover/types.ts
git commit -m "feat(recover): add recovery result types [obscura-0kv8]"
```

---

## Task 5: Identification stage

**Files:**
- Create: `src/recover/identify.ts`
- Test: `test/recover/identify.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/recover/identify.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { identifyFromHtml, CURRENT_FALLBACK_THEME } from '../../src/recover/identify.js';

describe('identifyFromHtml', () => {
  it('reads theme and version when both data attrs are present', () => {
    const html =
      '<html><head><meta name="generator" content="Obscura 20260331-21:29:32" data-theme="editorial" data-version="0.2.1"></head></html>';
    const result = identifyFromHtml(html);
    expect(result.theme).toBe('editorial');
    expect(result.version).toBe('0.2.1');
    expect(result.buildTimestamp).toBe('20260331-21:29:32');
    expect(result.usedFallback).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('falls back to default theme when data-theme missing', () => {
    const html =
      '<html><head><meta name="generator" content="Obscura 20260101-12:00:00"></head></html>';
    const result = identifyFromHtml(html);
    expect(result.theme).toBe(CURRENT_FALLBACK_THEME);
    expect(result.version).toBeNull();
    expect(result.buildTimestamp).toBe('20260101-12:00:00');
    expect(result.usedFallback).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('partial fallback when only data-version missing', () => {
    const html =
      '<html><head><meta name="generator" content="Obscura 20260101-12:00:00" data-theme="custom"></head></html>';
    const result = identifyFromHtml(html);
    expect(result.theme).toBe('custom');
    expect(result.version).toBeNull();
    expect(result.usedFallback).toBe(true);
  });

  it('throws when generator meta is absent', () => {
    const html = '<html><head><title>not Obscura</title></head></html>';
    expect(() => identifyFromHtml(html)).toThrow(/not an Obscura site/i);
  });

  it('throws when content does not start with "Obscura "', () => {
    const html = '<html><head><meta name="generator" content="Hugo 0.123"></head></html>';
    expect(() => identifyFromHtml(html)).toThrow(/not an Obscura site/i);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```
npm test -- test/recover/identify.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/recover/identify.ts`:

```ts
import * as cheerio from 'cheerio';
import type { Identified, RecoveryWarning } from './types.js';

/** Default theme assumed when an older site doesn't expose data-theme. */
export const CURRENT_FALLBACK_THEME = 'editorial';

/**
 * Parse the generator meta tag and return identification info.
 * Throws if the tag is missing or doesn't start with "Obscura ".
 */
export function identifyFromHtml(html: string): Identified {
  const $ = cheerio.load(html);
  const meta = $('meta[name="generator"]').first();
  if (meta.length === 0) {
    throw new Error(
      'not an Obscura site: missing <meta name="generator"> tag',
    );
  }
  const content = meta.attr('content') ?? '';
  if (!content.startsWith('Obscura ')) {
    throw new Error(
      `not an Obscura site: <meta name="generator" content="${content}"> does not start with "Obscura "`,
    );
  }

  const buildTimestamp = content.slice('Obscura '.length).trim() || null;
  const theme = meta.attr('data-theme') ?? null;
  const version = meta.attr('data-version') ?? null;

  const warnings: RecoveryWarning[] = [];
  if (theme === null) {
    warnings.push({
      category: 'identify',
      subject: 'theme',
      message: `data-theme attribute missing; assuming theme "${CURRENT_FALLBACK_THEME}" (older Obscura site).`,
    });
  }
  if (version === null) {
    warnings.push({
      category: 'identify',
      subject: 'version',
      message:
        'data-version attribute missing; assuming current Obscura version (older Obscura site).',
    });
  }

  return {
    theme: theme ?? CURRENT_FALLBACK_THEME,
    version,
    buildTimestamp,
    usedFallback: warnings.length > 0,
    warnings,
  };
}
```

- [ ] **Step 4: Run tests, verify they pass**

```
npm test -- test/recover/identify.test.ts
```

Expected: PASS (all 5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/recover/identify.ts test/recover/identify.test.ts
git commit -m "feat(recover): identify stage with theme/version fallback [obscura-0kv8]"
```

---

## Task 6: Polite HTTP fetch client

**Files:**
- Create: `src/recover/fetch.ts`
- Test: `test/recover/fetch.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/recover/fetch.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'node:http';
import { fetchText, fetchBuffer } from '../../src/recover/fetch.js';

let server: Server;
let baseUrl: string;
let requestCount = 0;
let flake = 0;

beforeAll(async () => {
  requestCount = 0;
  flake = 0;
  server = createServer((req, res) => {
    requestCount++;
    if (req.url === '/ok') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html>ok</html>');
    } else if (req.url === '/flake') {
      flake++;
      if (flake < 3) {
        res.writeHead(500);
        res.end('boom');
      } else {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html>recovered</html>');
      }
    } else if (req.url === '/binary') {
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    } else {
      res.writeHead(404);
      res.end('nope');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (typeof addr === 'string' || addr === null) throw new Error('bad addr');
  baseUrl = `http://127.0.0.1:${String(addr.port)}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('fetchText', () => {
  it('returns body for 200 OK', async () => {
    const body = await fetchText(`${baseUrl}/ok`);
    expect(body).toContain('ok');
  });

  it('retries on 5xx and succeeds', async () => {
    const body = await fetchText(`${baseUrl}/flake`, { retries: 3, retryDelayMs: 1 });
    expect(body).toContain('recovered');
    expect(flake).toBe(3);
  });

  it('throws on 404 (no retry on 4xx)', async () => {
    await expect(fetchText(`${baseUrl}/missing`)).rejects.toThrow(/404/);
  });
});

describe('fetchBuffer', () => {
  it('returns binary content', async () => {
    const buf = await fetchBuffer(`${baseUrl}/binary`);
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(0xff);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```
npm test -- test/recover/fetch.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/recover/fetch.ts`:

```ts
export interface FetchOptions {
  /** Number of additional attempts on 5xx / network errors. Default 3. */
  readonly retries?: number;
  /** Initial delay between retries in ms (doubled on each retry). Default 500. */
  readonly retryDelayMs?: number;
  /** Polite delay before every request, in ms. Default 0. */
  readonly politeDelayMs?: number;
}

const DEFAULT_OPTS: Required<FetchOptions> = {
  retries: 3,
  retryDelayMs: 500,
  politeDelayMs: 0,
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  opts: FetchOptions,
): Promise<Response> {
  const cfg = { ...DEFAULT_OPTS, ...opts };
  let lastError: unknown;
  let delay = cfg.retryDelayMs;
  for (let attempt = 0; attempt <= cfg.retries; attempt++) {
    if (cfg.politeDelayMs > 0) await sleep(cfg.politeDelayMs);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${String(response.status)} fetching ${url}`);
      }
      lastError = new Error(`HTTP ${String(response.status)} fetching ${url}`);
    } catch (e) {
      lastError = e;
    }
    if (attempt < cfg.retries) {
      await sleep(delay);
      delay *= 2;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch failed: ${url}`);
}

export async function fetchText(
  url: string,
  opts: FetchOptions = {},
): Promise<string> {
  const response = await fetchWithRetry(url, opts);
  return response.text();
}

export async function fetchBuffer(
  url: string,
  opts: FetchOptions = {},
): Promise<Uint8Array> {
  const response = await fetchWithRetry(url, opts);
  const arr = await response.arrayBuffer();
  return new Uint8Array(arr);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```
npm test -- test/recover/fetch.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/recover/fetch.ts test/recover/fetch.test.ts
git commit -m "feat(recover): polite HTTP client with retry/backoff [obscura-0kv8]"
```

---

## Task 7: Sitemap parser

**Files:**
- Create: `src/recover/sitemap.ts`
- Test: `test/recover/sitemap.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/recover/sitemap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { categoriseSitemap } from '../../src/recover/sitemap.js';

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/photography/</loc></url>
  <url><loc>https://example.com/photography/sample/</loc></url>
  <url><loc>https://example.com/photography/sample/sample-01/</loc></url>
  <url><loc>https://example.com/photography/sample/sample-02/</loc></url>
  <url><loc>https://example.com/blog/</loc></url>
  <url><loc>https://example.com/blog/welcome/</loc></url>
  <url><loc>https://example.com/about/</loc></url>
  <url><loc>https://example.com/contact/</loc></url>
  <url><loc>https://example.com/tags/</loc></url>
  <url><loc>https://example.com/tags/landscape/</loc></url>
  <url><loc>https://example.com/locations/</loc></url>
  <url><loc>https://example.com/locations/hamburg/</loc></url>
</urlset>`;

describe('categoriseSitemap', () => {
  it('separates URLs into the expected categories', () => {
    const result = categoriseSitemap(SITEMAP, 'https://example.com');
    expect(result.homepage).toBe('https://example.com/');
    expect(result.galleryIndex).toBe('https://example.com/photography/');
    expect(result.galleries).toEqual(['https://example.com/photography/sample/']);
    expect(result.photos).toEqual([
      'https://example.com/photography/sample/sample-01/',
      'https://example.com/photography/sample/sample-02/',
    ]);
    expect(result.posts).toEqual(['https://example.com/blog/welcome/']);
    expect(result.pages).toEqual([
      'https://example.com/about/',
      'https://example.com/contact/',
    ]);
  });

  it('handles a base_path subdirectory deploy', () => {
    const sm = SITEMAP.replaceAll('example.com/', 'example.com/portfolio/');
    const result = categoriseSitemap(sm, 'https://example.com/portfolio');
    expect(result.photos[0]).toBe(
      'https://example.com/portfolio/photography/sample/sample-01/',
    );
    expect(result.pages).toEqual([
      'https://example.com/portfolio/about/',
      'https://example.com/portfolio/contact/',
    ]);
  });

  it('ignores tag and location URLs (regenerated by build)', () => {
    const result = categoriseSitemap(SITEMAP, 'https://example.com');
    expect(result.pages).not.toContain('https://example.com/tags/landscape/');
    expect(result.pages).not.toContain('https://example.com/locations/hamburg/');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```
npm test -- test/recover/sitemap.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/recover/sitemap.ts`:

```ts
import * as cheerio from 'cheerio';
import type { EnumeratedUrls } from './types.js';

/**
 * Parse a sitemap.xml and categorise its URLs against a known base URL.
 * Tag and location URLs are dropped — they're regenerated by the local build.
 */
export function categoriseSitemap(
  sitemapXml: string,
  baseUrl: string,
): EnumeratedUrls {
  const $ = cheerio.load(sitemapXml, { xmlMode: true });
  const urls: string[] = [];
  $('url > loc').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) urls.push(text);
  });

  const base = baseUrl.replace(/\/+$/u, '');
  const pathOf = (u: string): string => {
    if (!u.startsWith(base)) return '';
    return u.slice(base.length) || '/';
  };

  let homepage = '';
  let galleryIndex: string | null = null;
  const galleries: string[] = [];
  const photos: string[] = [];
  const posts: string[] = [];
  const pages: string[] = [];

  for (const url of urls) {
    const path = pathOf(url);
    if (path === '') continue;
    if (path === '/') {
      homepage = url;
      continue;
    }
    if (path === '/photography/') {
      galleryIndex = url;
      continue;
    }
    if (path === '/blog/' || path === '/tags/' || path === '/locations/') {
      continue;
    }
    if (path.startsWith('/tags/') || path.startsWith('/locations/')) {
      continue;
    }
    const photoMatch = /^\/photography\/([^/]+)\/([^/]+)\/$/u.exec(path);
    if (photoMatch) {
      photos.push(url);
      continue;
    }
    const galleryMatch = /^\/photography\/([^/]+)\/$/u.exec(path);
    if (galleryMatch) {
      galleries.push(url);
      continue;
    }
    if (path.startsWith('/blog/')) {
      posts.push(url);
      continue;
    }
    // anything else at the top level is a Page
    if (/^\/[^/]+\/$/u.test(path)) {
      pages.push(url);
      continue;
    }
  }

  if (homepage === '') {
    throw new Error(`sitemap did not contain a homepage URL for base ${baseUrl}`);
  }

  return { homepage, galleryIndex, galleries, photos, posts, pages };
}
```

- [ ] **Step 4: Run tests, verify they pass**

```
npm test -- test/recover/sitemap.test.ts
```

Expected: PASS (3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/recover/sitemap.ts test/recover/sitemap.test.ts
git commit -m "feat(recover): sitemap parser and URL categorisation [obscura-0kv8]"
```

---

## Task 8: Photo-page parser

**Files:**
- Create: `src/recover/parse-photo.ts`
- Test: `test/recover/parse-photo.test.ts`
- Create: `test/recover/fixtures/photo-full.html`, `test/recover/fixtures/photo-minimal.html`, `test/recover/fixtures/photo-partial-settings.html`

- [ ] **Step 1: Write the fixtures**

Create `test/recover/fixtures/photo-full.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="generator" content="Obscura 20260101-12:00:00" data-theme="editorial" data-version="0.2.1">
  <meta property="og:url" content="https://example.com/photography/sample/sample-01/">
</head>
<body>
<div class="photo-detail">
  <div class="photo-detail__image">
    <img src="/img/photos/sample/sample-01-2400.webp"
         srcset="/img/photos/sample/sample-01-400.webp 400w, /img/photos/sample/sample-01-800.webp 800w, /img/photos/sample/sample-01-1200.webp 1200w, /img/photos/sample/sample-01-2400.webp 2400w"
         sizes="(max-width: 1200px) 100vw, 1200px"
         alt="The BRXTN Photographer">
  </div>
  <div class="photo-detail__body">
    <h1 class="photo-detail__title">The BRXTN Photographer</h1>
    <p class="photo-detail__caption">The creator of Obscura, caught in the act of finishing a roll.</p>
    <ul class="photo-meta">
      <li><span class="photo-meta__label">Photographer</span><span class="photo-meta__value">Jane Roe</span></li>
      <li><span class="photo-meta__label">Date</span><span class="photo-meta__value"><time datetime="2017-07-02">2 July 2017</time></span></li>
      <li><span class="photo-meta__label">Camera</span><span class="photo-meta__value">Canon AE-1</span></li>
      <li><span class="photo-meta__label">Lens</span><span class="photo-meta__value">Canon FD 50mm 1:1.8</span></li>
      <li><span class="photo-meta__label">Settings</span><span class="photo-meta__value">50mm · f/1.8 · ISO 100 · 1/200s</span></li>
      <li><span class="photo-meta__label">Location</span><span class="photo-meta__value"><a href="/locations/hamburg-germany/">Hamburg, Germany</a></span></li>
      <li><span class="photo-meta__label">License</span><span class="photo-meta__value"><a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a></span></li>
      <li class="photo-meta__tags-row"><span class="photo-meta__label">Tags</span><span class="photo-meta__value photo-meta__tags">
        <a class="tag" href="/tags/monochrome/">monochrome</a>
        <a class="tag" href="/tags/people/">people</a>
      </span></li>
    </ul>
  </div>
</div>
</body>
</html>
```

Create `test/recover/fixtures/photo-minimal.html`:

```html
<!DOCTYPE html>
<html><head>
<meta name="generator" content="Obscura 20260101-12:00:00" data-theme="editorial" data-version="0.2.1">
<meta property="og:url" content="https://example.com/photography/sample/lonely/">
</head><body>
<div class="photo-detail">
  <div class="photo-detail__image">
    <img src="/img/photos/sample/lonely.jpg" alt="lonely">
  </div>
  <div class="photo-detail__body">
    <h1 class="photo-detail__title">Lonely</h1>
    <ul class="photo-meta"></ul>
  </div>
</div>
</body></html>
```

Create `test/recover/fixtures/photo-partial-settings.html`:

```html
<!DOCTYPE html>
<html><head>
<meta name="generator" content="Obscura 20260101-12:00:00" data-theme="editorial" data-version="0.2.1">
<meta property="og:url" content="https://example.com/photography/sample/partial/">
</head><body>
<div class="photo-detail">
  <div class="photo-detail__image"><img src="/img/photos/sample/partial.jpg" alt="partial"></div>
  <div class="photo-detail__body">
    <h1 class="photo-detail__title">Partial</h1>
    <ul class="photo-meta">
      <li><span class="photo-meta__label">Settings</span><span class="photo-meta__value">f/1.8 · ISO 100</span></li>
    </ul>
  </div>
</div>
</body></html>
```

- [ ] **Step 2: Write the failing tests**

Create `test/recover/parse-photo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePhotoPage } from '../../src/recover/parse-photo.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parsePhotoPage', () => {
  it('extracts every field from a fully populated page', () => {
    const html = fixture('photo-full.html');
    const result = parsePhotoPage(html, 'https://example.com/photography/sample/sample-01/');
    expect(result.value.gallerySlug).toBe('sample');
    expect(result.value.photoSlug).toBe('sample-01');
    expect(result.value.metadata).toMatchObject({
      title: 'The BRXTN Photographer',
      caption: 'The creator of Obscura, caught in the act of finishing a roll.',
      camera: 'Canon AE-1',
      lens: 'Canon FD 50mm 1:1.8',
      focal_length: 50,
      aperture: 1.8,
      iso: 100,
      shutter_speed: '1/200',
      location: 'Hamburg, Germany',
      photographer: 'Jane Roe',
      license: 'CC-BY-4.0',
      tags: ['monochrome', 'people'],
    });
    expect(result.value.metadata.date).toEqual(new Date('2017-07-02'));
    expect(result.value.imageUrl).toBe('https://example.com/img/photos/sample/sample-01-2400.webp');
    expect(result.value.imageExt).toBe('.webp');
    expect(result.warnings).toHaveLength(0);
  });

  it('emits only the title when no other metadata is present', () => {
    const html = fixture('photo-minimal.html');
    const result = parsePhotoPage(html, 'https://example.com/photography/sample/lonely/');
    expect(result.value.metadata).toEqual({ title: 'Lonely' });
    expect(result.value.imageUrl).toBe('https://example.com/img/photos/sample/lonely.jpg');
  });

  it('extracts only the matched parts of a partial settings line', () => {
    const html = fixture('photo-partial-settings.html');
    const result = parsePhotoPage(html, 'https://example.com/photography/sample/partial/');
    expect(result.value.metadata.aperture).toBe(1.8);
    expect(result.value.metadata.iso).toBe(100);
    expect(result.value.metadata.focal_length).toBeUndefined();
    expect(result.value.metadata.shutter_speed).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```
npm test -- test/recover/parse-photo.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement**

Create `src/recover/parse-photo.ts`:

```ts
import * as cheerio from 'cheerio';
import type { PhotoMetadata } from '../types.js';
import type { ParsedPhoto, ParseResult, RecoveryWarning } from './types.js';

const LICENSE_URL_TO_ID: ReadonlyMap<string, string> = new Map([
  ['https://creativecommons.org/licenses/by/4.0/', 'CC-BY-4.0'],
  ['https://creativecommons.org/licenses/by-sa/4.0/', 'CC-BY-SA-4.0'],
  ['https://creativecommons.org/licenses/by-nc/4.0/', 'CC-BY-NC-4.0'],
  ['https://creativecommons.org/licenses/by-nc-sa/4.0/', 'CC-BY-NC-SA-4.0'],
  ['https://creativecommons.org/licenses/by-nd/4.0/', 'CC-BY-ND-4.0'],
  ['https://creativecommons.org/licenses/by-nc-nd/4.0/', 'CC-BY-NC-ND-4.0'],
  ['https://creativecommons.org/publicdomain/zero/1.0/', 'CC0-1.0'],
]);

interface LargestVariant {
  readonly url: string;
  readonly width: number;
}

function pickLargestVariant(
  src: string,
  srcset: string,
  baseUrl: string,
): LargestVariant | null {
  if (srcset.trim().length > 0) {
    let best: LargestVariant | null = null;
    for (const part of srcset.split(',')) {
      const trimmed = part.trim();
      const match = /^(\S+)\s+(\d+)w$/u.exec(trimmed);
      if (!match) continue;
      const width = Number(match[2]);
      const absUrl = new URL(match[1], baseUrl).toString();
      if (!best || width > best.width) {
        best = { url: absUrl, width };
      }
    }
    if (best) return best;
  }
  if (src.trim().length > 0) {
    return { url: new URL(src, baseUrl).toString(), width: 0 };
  }
  return null;
}

function extractMeta(
  $: cheerio.CheerioAPI,
  label: string,
): cheerio.Cheerio<cheerio.Element> | null {
  const labels = $('.photo-meta__label');
  const match = labels.filter((_, el) => $(el).text().trim() === label).first();
  if (match.length === 0) return null;
  return match.parent().find('.photo-meta__value').first();
}

function parseSettings(value: string): Partial<PhotoMetadata> {
  const result: Partial<PhotoMetadata> = {};
  const focal = /\b(\d+)mm\b/u.exec(value);
  if (focal) result.focal_length = Number(focal[1]);
  const ap = /\bf\/([\d.]+)\b/u.exec(value);
  if (ap) result.aperture = Number(ap[1]);
  const iso = /\bISO\s+(\d+)\b/u.exec(value);
  if (iso) result.iso = Number(iso[1]);
  const shutter = /\b(\d+\/\d+|\d+(?:\.\d+)?)s\b/u.exec(value);
  if (shutter) result.shutter_speed = shutter[1];
  return result;
}

function parseLicense(valueEl: cheerio.Cheerio<cheerio.Element>): string | undefined {
  const link = valueEl.find('a').first();
  if (link.length > 0) {
    const href = link.attr('href') ?? '';
    const mapped = LICENSE_URL_TO_ID.get(href);
    if (mapped) return mapped;
  }
  const text = valueEl.text().trim();
  return text.length > 0 ? text : undefined;
}

function deriveSlugs(pageUrl: string): { gallerySlug: string; photoSlug: string } {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/photography\/([^/]+)\/([^/]+)\/$/u.exec(path);
  if (!m) {
    throw new Error(`photo page URL does not match /photography/<g>/<p>/: ${pageUrl}`);
  }
  return { gallerySlug: m[1], photoSlug: m[2] };
}

export function parsePhotoPage(
  html: string,
  pageUrl: string,
): ParseResult<ParsedPhoto> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const { gallerySlug, photoSlug } = deriveSlugs(pageUrl);
  const metadata: Partial<PhotoMetadata> = {};

  const title = $('.photo-detail__title').first().text().trim();
  if (title.length > 0) metadata.title = title;

  const caption = $('.photo-detail__caption').first().text().trim();
  if (caption.length > 0) metadata.caption = caption;

  const dateEl = extractMeta($, 'Date');
  if (dateEl) {
    const iso = dateEl.find('time').attr('datetime');
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) metadata.date = d;
    }
  }

  const camera = extractMeta($, 'Camera')?.text().trim();
  if (camera) metadata.camera = camera;

  const lens = extractMeta($, 'Lens')?.text().trim();
  if (lens) metadata.lens = lens;

  const settingsText = extractMeta($, 'Settings')?.text().trim() ?? '';
  Object.assign(metadata, parseSettings(settingsText));

  const location = extractMeta($, 'Location')?.find('a').first().text().trim();
  if (location && location.length > 0) metadata.location = location;

  const photographer = extractMeta($, 'Photographer')?.text().trim();
  if (photographer) metadata.photographer = photographer;

  const licenseEl = extractMeta($, 'License');
  if (licenseEl) {
    const license = parseLicense(licenseEl);
    if (license) metadata.license = license;
  }

  const tags: string[] = [];
  const tagsEl = extractMeta($, 'Tags');
  if (tagsEl) {
    tagsEl.find('a.tag').each((_, el) => {
      tags.push($(el).text().trim());
    });
  }
  if (tags.length > 0) metadata.tags = tags;

  const img = $('.photo-detail__image img').first();
  const variant = pickLargestVariant(
    img.attr('src') ?? '',
    img.attr('srcset') ?? '',
    pageUrl,
  );
  let imageUrl: string | null = null;
  let imageExt: string | null = null;
  if (variant) {
    imageUrl = variant.url;
    const m = /\.([a-zA-Z0-9]+)(?:\?|$)/u.exec(new URL(variant.url).pathname);
    if (m) imageExt = `.${m[1].toLowerCase()}`;
  } else {
    warnings.push({
      category: 'image',
      subject: `${gallerySlug}/${photoSlug}`,
      message: 'no <img src> or srcset found; sidecar will be written without an image',
    });
  }

  return {
    value: { gallerySlug, photoSlug, metadata, imageUrl, imageExt },
    warnings,
  };
}
```

- [ ] **Step 5: Run tests, verify they pass**

```
npm test -- test/recover/parse-photo.test.ts
```

Expected: PASS (3 cases).

- [ ] **Step 6: Commit**

```bash
git add src/recover/parse-photo.ts test/recover/parse-photo.test.ts test/recover/fixtures/photo-*.html
git commit -m "feat(recover): photo page parser with missing-field tolerance [obscura-0kv8]"
```

---

## Task 9: Gallery-index parser

**Files:**
- Create: `src/recover/parse-gallery.ts`
- Test: `test/recover/parse-gallery.test.ts`
- Create: `test/recover/fixtures/gallery-sample.html`, `test/recover/fixtures/gallery-index.html`

- [ ] **Step 1: Write the fixtures**

Create `test/recover/fixtures/gallery-sample.html`:

```html
<!DOCTYPE html>
<html><head>
<meta name="generator" content="Obscura 20260101-12:00:00" data-theme="editorial" data-version="0.2.1">
</head><body>
<main>
  <h1>Sample Gallery</h1>
  <p class="gallery-intro">A sample gallery to demonstrate the structure.</p>
  <div class="gallery gallery--masonry">
    <a href="/photography/sample/sample-01/"></a>
    <a href="/photography/sample/sample-02/"></a>
  </div>
</main>
</body></html>
```

Create `test/recover/fixtures/gallery-index.html`:

```html
<!DOCTYPE html>
<html><head><meta name="generator" content="Obscura 20260101-12:00:00"></head><body>
<main>
  <ul class="gallery-list">
    <li><a href="/photography/sample/">Sample Gallery</a></li>
    <li><a href="/photography/landscapes/">Landscapes</a></li>
  </ul>
</main>
</body></html>
```

- [ ] **Step 2: Write the failing tests**

Create `test/recover/parse-gallery.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseGalleryPage,
  parseGalleryIndex,
} from '../../src/recover/parse-gallery.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parseGalleryPage', () => {
  it('extracts slug, title, description, and layout', () => {
    const html = fixture('gallery-sample.html');
    const listedSlugs = new Set(['sample', 'landscapes']);
    const result = parseGalleryPage(
      html,
      'https://example.com/photography/sample/',
      listedSlugs,
    );
    expect(result.value.entry).toMatchObject({
      slug: 'sample',
      title: 'Sample Gallery',
      description: 'A sample gallery to demonstrate the structure.',
      listed: true,
      layout: 'masonry',
    });
  });

  it('marks unlisted galleries when slug not in listed set', () => {
    const html = fixture('gallery-sample.html');
    const result = parseGalleryPage(
      html,
      'https://example.com/photography/sample/',
      new Set(),
    );
    expect(result.value.entry.listed).toBe(false);
  });
});

describe('parseGalleryIndex', () => {
  it('returns the slugs of listed galleries', () => {
    const html = fixture('gallery-index.html');
    const slugs = parseGalleryIndex(html, 'https://example.com');
    expect([...slugs].sort()).toEqual(['landscapes', 'sample']);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```
npm test -- test/recover/parse-gallery.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement**

Create `src/recover/parse-gallery.ts`:

```ts
import * as cheerio from 'cheerio';
import type { GalleryEntry, GalleryLayout } from '../types.js';
import type { ParsedGallery, ParseResult, RecoveryWarning } from './types.js';

function deriveSlug(pageUrl: string): string {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/photography\/([^/]+)\/$/u.exec(path);
  if (!m) {
    throw new Error(`gallery URL does not match /photography/<g>/: ${pageUrl}`);
  }
  return m[1];
}

function detectLayout($: cheerio.CheerioAPI): GalleryLayout | undefined {
  const container = $('.gallery').first();
  if (container.hasClass('gallery--grid')) return 'grid';
  if (container.hasClass('gallery--masonry')) return 'masonry';
  return undefined;
}

export function parseGalleryPage(
  html: string,
  pageUrl: string,
  listedSlugs: ReadonlySet<string>,
): ParseResult<ParsedGallery> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const slug = deriveSlug(pageUrl);

  const title = $('h1').first().text().trim();
  if (title.length === 0) {
    warnings.push({
      category: 'gallery',
      subject: slug,
      message: 'no <h1> found on gallery page; using slug as title',
    });
  }

  const description = $('.gallery-intro').first().text().trim();
  const layout = detectLayout($);

  const entry: GalleryEntry = {
    slug,
    title: title.length > 0 ? title : slug,
    listed: listedSlugs.has(slug),
    ...(description.length > 0 && { description }),
    ...(layout !== undefined && { layout }),
  };

  return { value: { entry }, warnings };
}

/**
 * Parse /photography/ to discover which gallery slugs are listed.
 * Any gallery whose detail page exists but isn't linked from here is `listed: false`.
 */
export function parseGalleryIndex(html: string, baseUrl: string): Set<string> {
  const $ = cheerio.load(html);
  const base = baseUrl.replace(/\/+$/u, '');
  const slugs = new Set<string>();
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const abs = href.startsWith('http') ? href : `${base}${href}`;
    const path = (() => {
      try {
        return new URL(abs).pathname;
      } catch {
        return '';
      }
    })();
    const m = /^.*\/photography\/([^/]+)\/$/u.exec(path);
    if (m) slugs.add(m[1]);
  });
  return slugs;
}
```

- [ ] **Step 5: Run tests, verify they pass**

```
npm test -- test/recover/parse-gallery.test.ts
```

Expected: PASS (3 cases).

- [ ] **Step 6: Commit**

```bash
git add src/recover/parse-gallery.ts test/recover/parse-gallery.test.ts test/recover/fixtures/gallery-*.html
git commit -m "feat(recover): gallery page and gallery-index parsers [obscura-0kv8]"
```

---

## Task 10: Homepage / site-config parser

**Files:**
- Create: `src/recover/parse-site.ts`
- Test: `test/recover/parse-site.test.ts`
- Create: `test/recover/fixtures/homepage-full.html`, `test/recover/fixtures/homepage-bare.html`

- [ ] **Step 1: Write the fixtures**

Create `test/recover/fixtures/homepage-full.html`:

```html
<!DOCTYPE html>
<html lang="en"><head>
<meta name="generator" content="Obscura 20260101-12:00:00" data-theme="editorial" data-version="0.2.1">
<title>My Portfolio - Landscapes &amp; Portraits</title>
<meta name="description" content="A portfolio of landscape and portrait photography.">
<meta property="og:url" content="https://example.com/">
</head><body>
<header class="site-header">
  <h1 class="site-title">My Portfolio</h1>
  <p class="site-subtitle">Landscapes &amp; Portraits</p>
  <nav class="site-nav">
    <a href="/photography/">Photography</a>
    <a href="/blog/">Blog</a>
    <a href="/about/">About</a>
  </nav>
</header>
<main>
  <section class="recent-shots">
    <img srcset="/img/a-400.webp 400w, /img/a-800.webp 800w, /img/a-1200.webp 1200w, /img/a-2400.webp 2400w">
  </section>
</main>
<footer>
  <p class="site-credit">Photography by Jane Roe</p>
  <ul class="social-links">
    <li><a href="https://bsky.app/profile/jane" aria-label="bluesky"></a></li>
    <li><a href="https://github.com/jane" aria-label="github"></a></li>
  </ul>
</footer>
</body></html>
```

Create `test/recover/fixtures/homepage-bare.html`:

```html
<!DOCTYPE html>
<html><head>
<meta name="generator" content="Obscura 20260101-12:00:00">
<title>Plain Site</title>
<meta property="og:url" content="https://plain.example/">
</head><body>
<header class="site-header"><h1 class="site-title">Plain Site</h1></header>
</body></html>
```

- [ ] **Step 2: Write the failing tests**

Create `test/recover/parse-site.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseHomepage } from '../../src/recover/parse-site.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parseHomepage', () => {
  it('extracts full site config from a rich homepage', () => {
    const html = fixture('homepage-full.html');
    const result = parseHomepage(html, 'editorial');
    expect(result.value.title).toBe('My Portfolio');
    expect(result.value.subtitle).toBe('Landscapes & Portraits');
    expect(result.value.description).toBe(
      'A portfolio of landscape and portrait photography.',
    );
    expect(result.value.base_url).toBe('https://example.com');
    expect(result.value.theme).toBe('editorial');
    expect(result.value.default_photographer).toBe('Jane Roe');
    expect(result.value.social_links).toEqual([
      { platform: 'bluesky', url: 'https://bsky.app/profile/jane' },
      { platform: 'github', url: 'https://github.com/jane' },
    ]);
    expect(result.value.images?.breakpoints).toEqual([400, 800, 1200, 2400]);
  });

  it('returns minimal config from a bare homepage without warnings beyond optionals', () => {
    const html = fixture('homepage-bare.html');
    const result = parseHomepage(html, 'editorial');
    expect(result.value.title).toBe('Plain Site');
    expect(result.value.base_url).toBe('https://plain.example');
    expect(result.value.subtitle).toBeUndefined();
    expect(result.value.description).toBeUndefined();
    expect(result.value.social_links).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```
npm test -- test/recover/parse-site.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement**

Create `src/recover/parse-site.ts`:

```ts
import * as cheerio from 'cheerio';
import type { SocialPlatform } from '../types.js';
import type {
  ParseResult,
  RecoveredSiteConfig,
  RecoveryWarning,
} from './types.js';

const SOCIAL_HOST_PATTERNS: ReadonlyArray<{ readonly host: RegExp; readonly platform: SocialPlatform }> = [
  { host: /(^|\.)bsky\.app$/u, platform: 'bluesky' },
  { host: /(^|\.)flickr\.com$/u, platform: 'flickr' },
  { host: /(^|\.)github\.com$/u, platform: 'github' },
  { host: /(^|\.)instagram\.com$/u, platform: 'instagram' },
  { host: /(^|\.)500px\.com$/u, platform: '500px' },
  { host: /(^|\.)pixelfed\.social$/u, platform: 'pixelfed' },
  { host: /(^|\.)mastodon\.social$/u, platform: 'mastodon' },
];

function detectSocialPlatform(url: string): SocialPlatform | null {
  try {
    const u = new URL(url);
    for (const { host, platform } of SOCIAL_HOST_PATTERNS) {
      if (host.test(u.hostname)) return platform;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function collectBreakpoints($: cheerio.CheerioAPI): number[] {
  const widths = new Set<number>();
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset') ?? '';
    for (const part of srcset.split(',')) {
      const m = /\s(\d+)w$/u.exec(part.trim());
      if (m) widths.add(Number(m[1]));
    }
  });
  return [...widths].sort((a, b) => a - b);
}

export function parseHomepage(
  html: string,
  theme: string,
): ParseResult<RecoveredSiteConfig> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];

  const headerTitle = $('header .site-title').first().text().trim();
  const titleTag = $('title').first().text().trim();
  const title = headerTitle.length > 0 ? headerTitle : titleTag.split(' - ')[0].trim();

  const subtitle = $('header .site-subtitle').first().text().trim() || undefined;
  const description = $('meta[name="description"]').attr('content')?.trim() || undefined;

  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() ?? '';
  if (ogUrl.length === 0) {
    throw new Error('homepage is missing <meta property="og:url">; cannot derive base_url');
  }
  const baseUrl = (() => {
    try {
      const u = new URL(ogUrl);
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/u, '')}`;
    } catch {
      throw new Error(`homepage og:url is not a valid URL: ${ogUrl}`);
    }
  })();

  const credit = $('footer .site-credit').first().text().trim();
  const photographerMatch = /^(?:Photography|Photos?|Images?)\s+by\s+(.+)$/iu.exec(credit);
  const defaultPhotographer = photographerMatch ? photographerMatch[1].trim() : undefined;

  const socialLinks: { readonly platform: SocialPlatform; readonly url: string }[] = [];
  $('footer .social-links a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const platform = detectSocialPlatform(href);
    if (platform) socialLinks.push({ platform, url: href });
  });

  const breakpoints = collectBreakpoints($);

  return {
    value: {
      theme,
      title: title.length > 0 ? title : 'Untitled',
      base_url: baseUrl,
      ...(subtitle !== undefined && { subtitle }),
      ...(description !== undefined && { description }),
      ...(defaultPhotographer !== undefined && { default_photographer: defaultPhotographer }),
      social_links: socialLinks,
      ...(breakpoints.length > 0 && {
        images: { breakpoints, webp_quality: 85 },
      }),
    },
    warnings,
  };
}
```

- [ ] **Step 5: Run tests, verify they pass**

```
npm test -- test/recover/parse-site.test.ts
```

Expected: PASS (2 cases).

- [ ] **Step 6: Commit**

```bash
git add src/recover/parse-site.ts test/recover/parse-site.test.ts test/recover/fixtures/homepage-*.html
git commit -m "feat(recover): homepage parser for site config [obscura-0kv8]"
```

---

## Task 11: Blog-post parser

**Files:**
- Create: `src/recover/parse-post.ts`
- Test: `test/recover/parse-post.test.ts`
- Create: `test/recover/fixtures/post-welcome.html`

- [ ] **Step 1: Write the fixture**

Create `test/recover/fixtures/post-welcome.html`:

```html
<!DOCTYPE html>
<html><head>
<meta name="generator" content="Obscura 20260101-12:00:00" data-theme="editorial" data-version="0.2.1">
<meta name="description" content="Welcome to my photography blog.">
<meta property="og:url" content="https://example.com/blog/welcome/">
</head><body>
<article>
  <h1>Welcome to my blog</h1>
  <time datetime="2026-01-15">15 January 2026</time>
  <ul class="tag-chips"><li><a href="/tags/intro/">intro</a></li></ul>
  <div class="post-body">
    <p>Hello world. Here is a photo:</p>
    <p><a href="/photography/sample/sample-01/"><img src="/img/photos/sample/sample-01-1200.webp" alt="Sample 01"></a></p>
    <p>And a regular link to <a href="https://example.org">somewhere else</a>.</p>
  </div>
</article>
</body></html>
```

- [ ] **Step 2: Write the failing tests**

Create `test/recover/parse-post.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBlogPost } from '../../src/recover/parse-post.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parseBlogPost', () => {
  it('extracts frontmatter and converts body to markdown', () => {
    const html = fixture('post-welcome.html');
    const result = parseBlogPost(html, 'https://example.com/blog/welcome/');
    expect(result.value.slug).toBe('welcome');
    expect(result.value.frontmatter.title).toBe('Welcome to my blog');
    expect(result.value.frontmatter.date).toEqual(new Date('2026-01-15'));
    expect(result.value.frontmatter.tags).toEqual(['intro']);
    expect(result.value.frontmatter.summary).toBe(
      'Welcome to my photography blog.',
    );
    expect(result.value.conversionFailed).toBe(false);
  });

  it('rewrites photo-page references to {{photo:gallery/slug}} shortcodes', () => {
    const html = fixture('post-welcome.html');
    const result = parseBlogPost(html, 'https://example.com/blog/welcome/');
    expect(result.value.markdownBody).toContain('{{photo:sample/sample-01}}');
    expect(result.value.markdownBody).not.toContain('/photography/sample/sample-01/');
  });

  it('preserves non-photo links', () => {
    const html = fixture('post-welcome.html');
    const result = parseBlogPost(html, 'https://example.com/blog/welcome/');
    expect(result.value.markdownBody).toContain('https://example.org');
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```
npm test -- test/recover/parse-post.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement**

Create `src/recover/parse-post.ts`:

```ts
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { ParsedPost, ParseResult, RecoveryWarning } from './types.js';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

function deriveSlug(pageUrl: string): string {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/blog\/([^/]+)\/$/u.exec(path);
  if (!m) {
    throw new Error(`post URL does not match /blog/<slug>/: ${pageUrl}`);
  }
  return m[1];
}

/** Replace links/images whose href targets /photography/<g>/<p>/ with shortcodes. */
function rewritePhotoShortcodes($body: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): void {
  $body.find('a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const m = /^\/photography\/([^/]+)\/([^/]+)\/$/u.exec(href);
    if (!m) return;
    const shortcode = `{{photo:${m[1]}/${m[2]}}}`;
    $(el).replaceWith($('<p></p>').text(shortcode));
  });
}

export function parseBlogPost(
  html: string,
  pageUrl: string,
): ParseResult<ParsedPost> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const slug = deriveSlug(pageUrl);

  const article = $('article').first();
  const title = article.find('h1').first().text().trim();
  const dateAttr = article.find('time').first().attr('datetime');
  const date = dateAttr ? new Date(dateAttr) : undefined;
  const tags: string[] = [];
  article.find('.tag-chips a').each((_, el) => {
    tags.push($(el).text().trim());
  });
  const summary = $('meta[name="description"]').attr('content')?.trim();

  const body = article.find('.post-body').first();
  if (body.length === 0) {
    warnings.push({
      category: 'post',
      subject: slug,
      message: 'no .post-body found; emitting empty Markdown body',
    });
  }
  rewritePhotoShortcodes(body, $);
  const bodyHtml = body.html() ?? '';

  let markdownBody = '';
  let conversionFailed = false;
  let rawHtml: string | undefined;
  try {
    markdownBody = turndown.turndown(bodyHtml).trim();
  } catch {
    conversionFailed = true;
    rawHtml = bodyHtml;
    warnings.push({
      category: 'post',
      subject: slug,
      message: 'Turndown threw on the post body; saved raw HTML alongside the .md stub',
    });
  }

  return {
    value: {
      slug,
      frontmatter: {
        ...(title.length > 0 && { title }),
        ...(date && !Number.isNaN(date.getTime()) && { date }),
        ...(tags.length > 0 && { tags }),
        ...(summary && summary.length > 0 && { summary }),
      },
      markdownBody,
      conversionFailed,
      ...(rawHtml !== undefined && { rawHtml }),
    },
    warnings,
  };
}
```

- [ ] **Step 5: Run tests, verify they pass**

```
npm test -- test/recover/parse-post.test.ts
```

Expected: PASS (3 cases).

- [ ] **Step 6: Commit**

```bash
git add src/recover/parse-post.ts test/recover/parse-post.test.ts test/recover/fixtures/post-welcome.html
git commit -m "feat(recover): blog post parser with photo-shortcode rewriting [obscura-0kv8]"
```

---

## Task 12: Page parser

**Files:**
- Create: `src/recover/parse-page.ts`
- Test: `test/recover/parse-page.test.ts`
- Create: `test/recover/fixtures/page-about.html`

- [ ] **Step 1: Write the fixture**

Create `test/recover/fixtures/page-about.html`:

```html
<!DOCTYPE html>
<html><head>
<meta name="generator" content="Obscura 20260101-12:00:00">
<meta property="og:url" content="https://example.com/about/">
</head><body>
<main class="page">
  <h1>About</h1>
  <div class="page-body">
    <p>I am a photographer based in Hamburg.</p>
    <ul><li>One</li><li>Two</li></ul>
  </div>
</main>
</body></html>
```

- [ ] **Step 2: Write the failing tests**

Create `test/recover/parse-page.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePage } from '../../src/recover/parse-page.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parsePage', () => {
  it('extracts title and converts body to markdown', () => {
    const html = fixture('page-about.html');
    const result = parsePage(html, 'https://example.com/about/');
    expect(result.value.slug).toBe('about');
    expect(result.value.frontmatter.title).toBe('About');
    expect(result.value.markdownBody).toContain('I am a photographer');
    expect(result.value.markdownBody).toContain('- One');
    expect(result.value.conversionFailed).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```
npm test -- test/recover/parse-page.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement**

Create `src/recover/parse-page.ts`:

```ts
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { ParsedPage, ParseResult, RecoveryWarning } from './types.js';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

function deriveSlug(pageUrl: string): string {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/([^/]+)\/$/u.exec(path);
  if (!m) {
    throw new Error(`page URL does not match /<slug>/: ${pageUrl}`);
  }
  return m[1];
}

export function parsePage(
  html: string,
  pageUrl: string,
): ParseResult<ParsedPage> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const slug = deriveSlug(pageUrl);

  const main = $('main.page, main').first();
  const title = main.find('h1').first().text().trim();
  const body = main.find('.page-body').first();
  if (body.length === 0) {
    warnings.push({
      category: 'page',
      subject: slug,
      message: 'no .page-body found; emitting empty Markdown body',
    });
  }
  const bodyHtml = body.html() ?? '';

  let markdownBody = '';
  let conversionFailed = false;
  let rawHtml: string | undefined;
  try {
    markdownBody = turndown.turndown(bodyHtml).trim();
  } catch {
    conversionFailed = true;
    rawHtml = bodyHtml;
    warnings.push({
      category: 'page',
      subject: slug,
      message: 'Turndown threw on the page body; saved raw HTML alongside the .md stub',
    });
  }

  return {
    value: {
      slug,
      frontmatter: title.length > 0 ? { title } : {},
      markdownBody,
      conversionFailed,
      ...(rawHtml !== undefined && { rawHtml }),
    },
    warnings,
  };
}
```

- [ ] **Step 5: Run tests, verify they pass**

```
npm test -- test/recover/parse-page.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/recover/parse-page.ts test/recover/parse-page.test.ts test/recover/fixtures/page-about.html
git commit -m "feat(recover): generic page parser [obscura-0kv8]"
```

---

## Task 13: Image downloader

**Files:**
- Create: `src/recover/download-image.ts`
- Test: `test/recover/download-image.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/recover/download-image.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { downloadImage } from '../../src/recover/download-image.js';

let server: Server;
let baseUrl: string;
let workDir: string;

beforeAll(async () => {
  server = createServer((_, res) => {
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  if (typeof addr === 'string' || addr === null) throw new Error('bad addr');
  baseUrl = `http://127.0.0.1:${String(addr.port)}`;
  workDir = await mkdtemp(resolve(tmpdir(), 'obscura-recover-'));
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await rm(workDir, { recursive: true, force: true });
});

describe('downloadImage', () => {
  it('downloads a binary and writes it to disk', async () => {
    const targetPath = resolve(workDir, 'sample-01.jpg');
    await downloadImage(`${baseUrl}/img.jpg`, targetPath);
    const data = await readFile(targetPath);
    expect(data.length).toBe(4);
    expect(data[0]).toBe(0xff);
    expect(data[3]).toBe(0xd9);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```
npm test -- test/recover/download-image.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/recover/download-image.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fetchBuffer } from './fetch.js';

export async function downloadImage(
  url: string,
  destPath: string,
): Promise<void> {
  const buf = await fetchBuffer(url);
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
}
```

- [ ] **Step 4: Run test, verify it passes**

```
npm test -- test/recover/download-image.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/recover/download-image.ts test/recover/download-image.test.ts
git commit -m "feat(recover): binary image downloader [obscura-0kv8]"
```

---

## Task 14: Project writer

**Files:**
- Create: `src/recover/write.ts`
- Test: `test/recover/write.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/recover/write.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  writeSiteConfig,
  writeGalleriesConfig,
  writeSidecar,
  writePost,
  writePage,
} from '../../src/recover/write.js';
import type { GalleryEntry, PhotoMetadata } from '../../src/types.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(resolve(tmpdir(), 'obscura-recover-write-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('writeSiteConfig', () => {
  it('writes a YAML file with only the provided fields', async () => {
    await writeSiteConfig(workDir, {
      theme: 'editorial',
      title: 'My Site',
      base_url: 'https://example.com',
    });
    const content = await readFile(
      resolve(workDir, 'site', 'config', 'site.yaml'),
      'utf-8',
    );
    const parsed = parseYaml(content) as Record<string, unknown>;
    expect(parsed).toMatchObject({ theme: 'editorial', title: 'My Site' });
    expect(parsed.description).toBeUndefined();
  });
});

describe('writeGalleriesConfig', () => {
  it('writes the galleries list', async () => {
    const entries: GalleryEntry[] = [
      { slug: 'sample', title: 'Sample', listed: true },
    ];
    await writeGalleriesConfig(workDir, entries);
    const content = await readFile(
      resolve(workDir, 'site', 'config', 'galleries.yaml'),
      'utf-8',
    );
    const parsed = parseYaml(content) as { galleries: { slug: string }[] };
    expect(parsed.galleries[0].slug).toBe('sample');
  });
});

describe('writeSidecar', () => {
  it('writes only the present fields, dates as ISO strings', async () => {
    const meta: Partial<PhotoMetadata> = {
      title: 'A',
      date: new Date('2017-07-02'),
      tags: ['x'],
    };
    await writeSidecar(workDir, 'sample', 'sample-01', meta);
    const content = await readFile(
      resolve(workDir, 'site', 'content', 'photos', 'sample', 'sample-01.yaml'),
      'utf-8',
    );
    expect(content).toContain('title: A');
    expect(content).toContain('date: 2017-07-02');
    expect(content).toContain('tags:');
    expect(content).not.toContain('caption');
  });
});

describe('writePost / writePage', () => {
  it('writes a post with YAML frontmatter then body', async () => {
    await writePost(workDir, {
      slug: 'hi',
      frontmatter: { title: 'Hi', date: new Date('2026-01-01'), tags: [] },
      markdownBody: 'Hello',
      conversionFailed: false,
    });
    const content = await readFile(
      resolve(workDir, 'site', 'content', 'posts', 'hi.md'),
      'utf-8',
    );
    expect(content.startsWith('---\n')).toBe(true);
    expect(content).toContain('title: Hi');
    expect(content).toContain('\nHello\n');
  });

  it('writes a page', async () => {
    await writePage(workDir, {
      slug: 'about',
      frontmatter: { title: 'About' },
      markdownBody: '# About',
      conversionFailed: false,
    });
    const content = await readFile(
      resolve(workDir, 'site', 'content', 'pages', 'about.md'),
      'utf-8',
    );
    expect(content).toContain('title: About');
  });

  it('writes raw HTML beside the stub when conversion failed', async () => {
    await writePost(workDir, {
      slug: 'broken',
      frontmatter: { title: 'Broken' },
      markdownBody: '',
      conversionFailed: true,
      rawHtml: '<p>oops</p>',
    });
    const html = await readFile(
      resolve(workDir, 'site', 'content', 'posts', 'broken.html'),
      'utf-8',
    );
    expect(html).toBe('<p>oops</p>');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```
npm test -- test/recover/write.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/recover/write.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import type { GalleryEntry, PhotoMetadata } from '../types.js';
import type {
  ParsedPage,
  ParsedPost,
  RecoveredSiteConfig,
} from './types.js';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

export async function writeSiteConfig(
  targetDir: string,
  cfg: RecoveredSiteConfig,
): Promise<void> {
  const serialisable = JSON.parse(JSON.stringify(cfg)) as Record<string, unknown>;
  const yaml = stringifyYaml(serialisable);
  await writeText(resolve(targetDir, 'site', 'config', 'site.yaml'), yaml);
}

export async function writeGalleriesConfig(
  targetDir: string,
  galleries: readonly GalleryEntry[],
): Promise<void> {
  const yaml = stringifyYaml({ galleries });
  await writeText(resolve(targetDir, 'site', 'config', 'galleries.yaml'), yaml);
}

export async function writeSidecar(
  targetDir: string,
  gallerySlug: string,
  photoSlug: string,
  metadata: Partial<PhotoMetadata>,
): Promise<void> {
  const serialisable: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (v === undefined) continue;
    if (v instanceof Date) {
      serialisable[k] = isoDate(v);
    } else {
      serialisable[k] = v;
    }
  }
  const yaml = stringifyYaml(serialisable);
  await writeText(
    resolve(
      targetDir,
      'site',
      'content',
      'photos',
      gallerySlug,
      `${photoSlug}.yaml`,
    ),
    yaml,
  );
}

function renderFrontmatter(fm: Record<string, unknown>): string {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined) continue;
    out[k] = v instanceof Date ? isoDate(v) : v;
  }
  return `---\n${stringifyYaml(out)}---\n`;
}

export async function writePost(
  targetDir: string,
  post: ParsedPost,
): Promise<void> {
  const path = resolve(targetDir, 'site', 'content', 'posts', `${post.slug}.md`);
  const frontmatter = renderFrontmatter(post.frontmatter);
  await writeText(path, `${frontmatter}\n${post.markdownBody}\n`);
  if (post.conversionFailed && post.rawHtml) {
    const htmlPath = resolve(
      targetDir,
      'site',
      'content',
      'posts',
      `${post.slug}.html`,
    );
    await writeText(htmlPath, post.rawHtml);
  }
}

export async function writePage(
  targetDir: string,
  page: ParsedPage,
): Promise<void> {
  const path = resolve(targetDir, 'site', 'content', 'pages', `${page.slug}.md`);
  const frontmatter = renderFrontmatter(page.frontmatter);
  await writeText(path, `${frontmatter}\n${page.markdownBody}\n`);
  if (page.conversionFailed && page.rawHtml) {
    const htmlPath = resolve(
      targetDir,
      'site',
      'content',
      'pages',
      `${page.slug}.html`,
    );
    await writeText(htmlPath, page.rawHtml);
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

```
npm test -- test/recover/write.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/recover/write.ts test/recover/write.test.ts
git commit -m "feat(recover): project writer for site/config and content [obscura-0kv8]"
```

---

## Task 15: Recovery report generator

**Files:**
- Create: `src/recover/report.ts`
- Test: `test/recover/report.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/recover/report.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatReport } from '../../src/recover/report.js';

describe('formatReport', () => {
  it('renders a Markdown report grouped by category', () => {
    const report = formatReport({
      sourceUrl: 'https://example.com',
      identifiedVersion: '0.2.1',
      identifiedTheme: 'editorial',
      buildTimestamp: '20260101-12:00:00',
      counts: { galleries: 1, photos: 3, posts: 1, pages: 2 },
      warnings: [
        { category: 'identify', subject: 'theme', message: 'assumed editorial' },
        { category: 'photo', subject: 'sample/sample-02', message: 'no caption' },
        { category: 'image', subject: 'sample/sample-03', message: 'download failed' },
      ],
    });
    expect(report).toContain('# Recovery Report');
    expect(report).toContain('https://example.com');
    expect(report).toContain('## Identification');
    expect(report).toContain('## Photos');
    expect(report).toContain('sample/sample-02');
    expect(report).toContain('## Images');
    expect(report).toContain('sample/sample-03');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```
npm test -- test/recover/report.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/recover/report.ts`:

```ts
import type { RecoveryWarning } from './types.js';

export interface ReportInput {
  readonly sourceUrl: string;
  readonly identifiedTheme: string;
  readonly identifiedVersion: string | null;
  readonly buildTimestamp: string | null;
  readonly counts: {
    readonly galleries: number;
    readonly photos: number;
    readonly posts: number;
    readonly pages: number;
  };
  readonly warnings: readonly RecoveryWarning[];
}

const CATEGORY_TITLES: Readonly<Record<RecoveryWarning['category'], string>> = {
  identify: 'Identification',
  site: 'Site config',
  gallery: 'Galleries',
  photo: 'Photos',
  post: 'Posts',
  page: 'Pages',
  image: 'Images',
  sitemap: 'Sitemap',
};

export function formatReport(input: ReportInput): string {
  const lines: string[] = [];
  lines.push('# Recovery Report');
  lines.push('');
  lines.push(`Source: ${input.sourceUrl}`);
  lines.push(`Upstream theme: \`${input.identifiedTheme}\``);
  lines.push(
    `Upstream Obscura version: ${input.identifiedVersion ?? '_(unknown — older site)_'}`,
  );
  if (input.buildTimestamp) {
    lines.push(`Upstream build timestamp: ${input.buildTimestamp}`);
  }
  lines.push('');
  lines.push('## Recovered counts');
  lines.push('');
  lines.push(`- Galleries: ${String(input.counts.galleries)}`);
  lines.push(`- Photos: ${String(input.counts.photos)}`);
  lines.push(`- Posts: ${String(input.counts.posts)}`);
  lines.push(`- Pages: ${String(input.counts.pages)}`);
  lines.push('');

  const grouped = new Map<RecoveryWarning['category'], RecoveryWarning[]>();
  for (const w of input.warnings) {
    const list = grouped.get(w.category) ?? [];
    list.push(w);
    grouped.set(w.category, list);
  }

  if (input.warnings.length === 0) {
    lines.push('## Issues');
    lines.push('');
    lines.push('_None. Everything detected was extracted._');
    lines.push('');
    return lines.join('\n');
  }

  for (const [category, list] of grouped) {
    lines.push(`## ${CATEGORY_TITLES[category]}`);
    lines.push('');
    for (const w of list) {
      lines.push(`- \`${w.subject}\` — ${w.message}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test, verify it passes**

```
npm test -- test/recover/report.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/recover/report.ts test/recover/report.test.ts
git commit -m "feat(recover): recovery-report.md generator [obscura-0kv8]"
```

---

## Task 16: Orchestrator entry module

**Files:**
- Create: `src/recover.ts`

- [ ] **Step 1: Create the orchestrator**

Create `src/recover.ts`:

```ts
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { fetchText } from './recover/fetch.js';
import { identifyFromHtml } from './recover/identify.js';
import { categoriseSitemap } from './recover/sitemap.js';
import { parseHomepage } from './recover/parse-site.js';
import {
  parseGalleryPage,
  parseGalleryIndex,
} from './recover/parse-gallery.js';
import { parsePhotoPage } from './recover/parse-photo.js';
import { parseBlogPost } from './recover/parse-post.js';
import { parsePage } from './recover/parse-page.js';
import { downloadImage } from './recover/download-image.js';
import {
  writeSiteConfig,
  writeGalleriesConfig,
  writeSidecar,
  writePost,
  writePage,
} from './recover/write.js';
import { formatReport } from './recover/report.js';
import type { RecoveryWarning } from './recover/types.js';
import type { GalleryEntry } from './types.js';

interface CliArgs {
  readonly url: string;
  readonly targetDir: string;
  readonly force: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const positional: string[] = [];
  let force = false;
  for (const arg of argv) {
    if (arg === '--force') force = true;
    else positional.push(arg);
  }
  if (positional.length < 1) {
    throw new Error('usage: npm run recover -- <url> [target-dir] [--force]');
  }
  const url = positional[0];
  const targetDir = resolve(positional[1] ?? process.cwd());
  return { url, targetDir, force };
}

async function targetIsEmpty(targetDir: string): Promise<boolean> {
  const sitePath = resolve(targetDir, 'site');
  if (!existsSync(sitePath)) return true;
  const entries = await readdir(sitePath);
  return entries.length === 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Obscura — recovering ${args.url}`);
  console.log(`Target:   ${args.targetDir}`);

  if (!args.force && !(await targetIsEmpty(args.targetDir))) {
    console.error(
      'Error: site/ already exists and is non-empty in the target directory.',
    );
    console.error('Pass --force to overwrite.');
    process.exit(1);
  }

  const allWarnings: RecoveryWarning[] = [];

  const landingHtml = await fetchText(args.url);
  const identity = identifyFromHtml(landingHtml);
  allWarnings.push(...identity.warnings);
  console.log(
    `  Identified Obscura ${identity.version ?? '(unknown)'} / theme=${identity.theme}`,
  );

  const homepageParse = parseHomepage(landingHtml, identity.theme);
  allWarnings.push(...homepageParse.warnings);
  const siteConfig = homepageParse.value;
  const baseUrl = siteConfig.base_url;

  const sitemapXml = await fetchText(`${baseUrl}/sitemap.xml`);
  const urls = categoriseSitemap(sitemapXml, baseUrl);
  console.log(
    `  Sitemap: ${String(urls.galleries.length)} galleries, ${String(urls.photos.length)} photos, ${String(urls.posts.length)} posts, ${String(urls.pages.length)} pages`,
  );

  const listedSlugs = urls.galleryIndex
    ? parseGalleryIndex(await fetchText(urls.galleryIndex), baseUrl)
    : new Set<string>();

  const galleries: GalleryEntry[] = [];
  for (const url of urls.galleries) {
    try {
      const html = await fetchText(url);
      const parsed = parseGalleryPage(html, url, listedSlugs);
      allWarnings.push(...parsed.warnings);
      galleries.push(parsed.value.entry);
    } catch (e) {
      allWarnings.push({
        category: 'gallery',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  let photoCount = 0;
  for (const url of urls.photos) {
    try {
      const html = await fetchText(url);
      const parsed = parsePhotoPage(html, url);
      allWarnings.push(...parsed.warnings);
      const { gallerySlug, photoSlug, metadata, imageUrl, imageExt } = parsed.value;
      await writeSidecar(args.targetDir, gallerySlug, photoSlug, metadata);
      if (imageUrl && imageExt) {
        const dest = resolve(
          args.targetDir,
          'site',
          'content',
          'photos',
          gallerySlug,
          `${photoSlug}${imageExt}`,
        );
        try {
          await downloadImage(imageUrl, dest);
        } catch (e) {
          allWarnings.push({
            category: 'image',
            subject: `${gallerySlug}/${photoSlug}`,
            message: `download failed: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
      photoCount++;
    } catch (e) {
      allWarnings.push({
        category: 'photo',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  let postCount = 0;
  for (const url of urls.posts) {
    try {
      const html = await fetchText(url);
      const parsed = parseBlogPost(html, url);
      allWarnings.push(...parsed.warnings);
      await writePost(args.targetDir, parsed.value);
      postCount++;
    } catch (e) {
      allWarnings.push({
        category: 'post',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  let pageCount = 0;
  for (const url of urls.pages) {
    try {
      const html = await fetchText(url);
      const parsed = parsePage(html, url);
      allWarnings.push(...parsed.warnings);
      await writePage(args.targetDir, parsed.value);
      pageCount++;
    } catch (e) {
      allWarnings.push({
        category: 'page',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  await writeSiteConfig(args.targetDir, siteConfig);
  await writeGalleriesConfig(args.targetDir, galleries);

  const report = formatReport({
    sourceUrl: args.url,
    identifiedTheme: identity.theme,
    identifiedVersion: identity.version,
    buildTimestamp: identity.buildTimestamp,
    counts: {
      galleries: galleries.length,
      photos: photoCount,
      posts: postCount,
      pages: pageCount,
    },
    warnings: allWarnings,
  });
  await mkdir(args.targetDir, { recursive: true });
  await writeFile(resolve(args.targetDir, 'recovery-report.md'), report, 'utf-8');

  console.log(
    `\n✓ Recovered ${String(galleries.length)} galleries, ${String(photoCount)} photos, ${String(postCount)} posts, ${String(pageCount)} pages`,
  );
  console.log(`  Report: ${resolve(args.targetDir, 'recovery-report.md')}`);
  if (allWarnings.length > 0) {
    console.log(`  ${String(allWarnings.length)} warnings — see report for details.`);
  }
}

void main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(`\n✗ Recovery failed: ${err.message}`);
  } else {
    console.error('\n✗ Recovery failed with an unknown error');
  }
  process.exitCode = 1;
});
```

- [ ] **Step 2: Verify typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/recover.ts
git commit -m "feat(recover): orchestrator entry module [obscura-0kv8]"
```

---

## Task 17: Wire up the npm script

**Files:**
- Modify: `package.json:scripts`

- [ ] **Step 1: Add the script**

Edit `package.json`, inside `scripts`, add after `"migrate": "tsc && node dist-build/migrate.js"`:

```json
    "recover": "tsc && node dist-build/recover.js"
```

(Don't forget the comma on the preceding line.)

- [ ] **Step 2: Verify it runs (and prints usage with no args)**

```bash
npm run recover 2>&1 | head -5
```

Expected: prints `usage: npm run recover -- <url> [target-dir] [--force]` and exits non-zero.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add 'recover' npm script [obscura-0kv8]"
```

---

## Task 18: Round-trip integration test

**Files:**
- Create: `test/recover/roundtrip.test.ts`

- [ ] **Step 1: Write the test**

Create `test/recover/roundtrip.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { cp, rm, readFile, mkdtemp, symlink, readdir } from 'node:fs/promises';
import { createServer, Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { parse as parseYaml } from 'yaml';
import { build } from '../../src/build.js';
import { fetchText } from '../../src/recover/fetch.js';
import { identifyFromHtml } from '../../src/recover/identify.js';
import { categoriseSitemap } from '../../src/recover/sitemap.js';
import { parseHomepage } from '../../src/recover/parse-site.js';
import {
  parseGalleryPage,
  parseGalleryIndex,
} from '../../src/recover/parse-gallery.js';
import { parsePhotoPage } from '../../src/recover/parse-photo.js';
import {
  writeSiteConfig,
  writeGalleriesConfig,
  writeSidecar,
} from '../../src/recover/write.js';
import { downloadImage } from '../../src/recover/download-image.js';

const FIXTURE_DIR = resolve(import.meta.dirname, '..', 'fixtures', 'site');
const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
let buildDir: string;
let recoverDir: string;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  buildDir = await mkdtemp(resolve(tmpdir(), 'obscura-rt-build-'));
  recoverDir = await mkdtemp(resolve(tmpdir(), 'obscura-rt-recover-'));
  await cp(FIXTURE_DIR, buildDir, { recursive: true });
  await symlink(
    resolve(PROJECT_ROOT, 'themes', 'editorial'),
    resolve(buildDir, 'themes', 'editorial'),
  );
  await build(buildDir);

  const distDir = resolve(buildDir, 'dist');
  server = createServer((req, res) => {
    const url = req.url ?? '/';
    let filepath = resolve(distDir, '.' + url.replace(/\?.*/u, ''));
    if (existsSync(filepath) && statSync(filepath).isDirectory()) {
      filepath = resolve(filepath, 'index.html');
    }
    if (!existsSync(filepath)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = filepath.slice(filepath.lastIndexOf('.'));
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.xml': 'application/xml',
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.css': 'text/css',
      '.js': 'text/javascript',
    };
    res.writeHead(200, { 'content-type': types[ext] ?? 'application/octet-stream' });
    createReadStream(filepath).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  if (typeof addr === 'string' || addr === null) throw new Error('bad addr');
  baseUrl = `http://127.0.0.1:${String(addr.port)}`;
}, 60_000);

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await rm(buildDir, { recursive: true, force: true });
  await rm(recoverDir, { recursive: true, force: true });
});

describe('site recovery round-trip', () => {
  it('recovers site.yaml, galleries.yaml, sidecars, and an image from a built example', async () => {
    const landing = await fetchText(`${baseUrl}/`);
    const id = identifyFromHtml(landing);
    expect(id.theme).toBe('editorial');

    const homepage = parseHomepage(landing, id.theme);
    // Override base_url to the test server so subsequent URLs resolve correctly:
    const siteCfg = { ...homepage.value, base_url: baseUrl };

    const sitemap = await fetchText(`${baseUrl}/sitemap.xml`);
    const urls = categoriseSitemap(sitemap, baseUrl);
    expect(urls.photos.length).toBeGreaterThan(0);

    const listedSlugs = urls.galleryIndex
      ? parseGalleryIndex(await fetchText(urls.galleryIndex), baseUrl)
      : new Set<string>();

    const galleries = [];
    for (const u of urls.galleries) {
      const parsed = parseGalleryPage(await fetchText(u), u, listedSlugs);
      galleries.push(parsed.value.entry);
    }

    for (const u of urls.photos) {
      const parsed = parsePhotoPage(await fetchText(u), u);
      const { gallerySlug, photoSlug, metadata, imageUrl, imageExt } = parsed.value;
      await writeSidecar(recoverDir, gallerySlug, photoSlug, metadata);
      if (imageUrl && imageExt) {
        await downloadImage(
          imageUrl,
          resolve(
            recoverDir,
            'site',
            'content',
            'photos',
            gallerySlug,
            `${photoSlug}${imageExt}`,
          ),
        );
      }
    }

    await writeSiteConfig(recoverDir, siteCfg);
    await writeGalleriesConfig(recoverDir, galleries);

    // -- Assertions --

    const recoveredSite = parseYaml(
      await readFile(resolve(recoverDir, 'site', 'config', 'site.yaml'), 'utf-8'),
    ) as { title: string; theme: string };
    const originalSite = parseYaml(
      await readFile(resolve(FIXTURE_DIR, 'config', 'site.yaml'), 'utf-8'),
    ) as { title: string; theme: string };
    expect(recoveredSite.theme).toBe(originalSite.theme);
    expect(recoveredSite.title).toBe(originalSite.title);

    const originalPhotos = await readdir(
      resolve(FIXTURE_DIR, 'content', 'photos', 'sample'),
    );
    const yamlFiles = originalPhotos.filter((f) => f.endsWith('.yaml'));
    for (const yamlFile of yamlFiles) {
      const slug = yamlFile.replace(/\.yaml$/u, '');
      const recoveredPath = resolve(
        recoverDir,
        'site',
        'content',
        'photos',
        'sample',
        yamlFile,
      );
      expect(existsSync(recoveredPath), `missing ${slug}`).toBe(true);
    }
  }, 60_000);
});
```

- [ ] **Step 2: Run the test**

```bash
npm test -- test/recover/roundtrip.test.ts
```

Expected: PASS. If the fixture site lacks a photo, the photo-count assertion fails — in that case, check `test/fixtures/site/content/photos/sample/` is populated (it normally has at least `sample-01.jpg`).

- [ ] **Step 3: Commit**

```bash
git add test/recover/roundtrip.test.ts
git commit -m "test(recover): round-trip integration test via in-process server [obscura-0kv8]"
```

---

## Task 19: README "I lost my local setup" section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the section**

Add a new section near the existing usage/troubleshooting content in `README.md`. Pick an appropriate location (e.g. after "Getting started" or in a new "Troubleshooting" section):

```markdown
## I lost my local setup

If your local Obscura project is gone but your site is still deployed, you can rebuild a working project from the live URL:

```bash
git clone <obscura-repo>
cd <obscura-repo>
npm install
npm run recover -- https://your-site.example
npm run build
```

`recover` reconstructs `site/config/site.yaml`, `site/config/galleries.yaml`, all photo sidecar YAML files, blog posts, and pages, and downloads the largest available image variant for each photo. It then writes `recovery-report.md` next to `site/` listing anything that couldn't be fully recovered (e.g. GPS coordinates, which are never published).

Recovery requires the upstream site to have been built by Obscura — it identifies sites via the `<meta name="generator">` tag every Obscura theme emits. Older builds without `data-theme` / `data-version` attributes are recovered with sensible defaults (theme `editorial`, current Obscura version) noted in the report.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add recovery workflow to README [obscura-0kv8]"
```

---

## Task 20: docs/cli.md update

**Files:**
- Modify: `docs/cli.md`

- [ ] **Step 1: Add the command reference**

Append to `docs/cli.md` (or place it next to other commands following the existing structure):

```markdown
### `npm run recover -- <url> [target-dir] [--force]`

Reconstruct an editable Obscura project from a deployed site's URL.

- `<url>` — landing URL of the live Obscura site (required).
- `[target-dir]` — defaults to the current directory. The recovered project is written into `target-dir/site/`, and `target-dir/recovery-report.md` summarises anything that couldn't be fully recovered.
- `--force` — proceed even if `target-dir/site/` already exists and is non-empty. Existing files may be overwritten.

What recovery extracts:

- `site.yaml`: title, subtitle, description, base URL, theme, social links, default photographer, image breakpoints
- `galleries.yaml`: every gallery's slug, title, description, layout, and listed flag
- Per-photo sidecar YAML: title, caption, date, camera, lens, focal length, aperture, ISO, shutter speed, location, photographer, license, tags
- Per-photo image: the largest variant offered by the upstream `<img srcset>` (typically the 2400 px WebP)
- Blog posts and pages: frontmatter + HTML-to-Markdown body, with photo references restored to `{{photo:gallery/slug}}` shortcodes

What it does not extract (not recoverable from published HTML): GPS coordinates, EXIF data not displayed by the theme, the original full-resolution photos.

Recovery fails fast if the site does not advertise itself as Obscura via `<meta name="generator">`, or if `/sitemap.xml` is missing.
```

- [ ] **Step 2: Commit**

```bash
git add docs/cli.md
git commit -m "docs: document npm run recover in docs/cli.md [obscura-0kv8]"
```

---

## Task 21: Mark the bean done

**Files:**
- Update: bean `obscura-0kv8`

- [ ] **Step 1: Verify the full suite still passes**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all green.

- [ ] **Step 2: Update the bean**

```bash
beans update obscura-0kv8 -s completed --body-append "## Summary of Changes

- Extended generator meta tag with data-theme and data-version (ADR-015)
- Exposed obscura_version template global from package.json
- New src/recover.ts entry + src/recover/* modules (fetch, identify, sitemap, parse-site, parse-gallery, parse-photo, parse-post, parse-page, download-image, write, report, types)
- npm run recover script wired up
- Unit tests for every parser (full + missing-field fixtures)
- Round-trip integration test against examples/default-site/ via in-process server
- README troubleshooting section and docs/cli.md updated"
```

---

## Final Notes

- **Frequent commits:** every task produces one or more commits. Don't bundle unrelated changes.
- **TDD throughout:** every implementation task follows red → green → commit.
- **No placeholders:** all code blocks above are intended to compile and pass under the project's strict TypeScript and ESLint settings. If a snippet trips a lint rule (e.g. unused import after Cheerio API changes), fix and commit; don't paper over with `// eslint-disable`.
- **Cheerio type imports:** Cheerio 1.x exposes element types via `domhandler`. If you see `cheerio.Element` referenced in this plan and your installed Cheerio version exports it from `domhandler` instead, swap the import; do not introduce `any`.
- **Known scope-limited deviations from the spec:**
  - License and photographer values are written per-sidecar even when uniform across the site (the spec describes hoisting them to `site.yaml`). Functionally equivalent — the local build accepts both — but aesthetically redundant. If you want to tighten this, file a separate bean rather than expanding scope here.
- **Follow-up:** `obscura-0p2f` is the link-crawl fallback ticket. It's out of scope for this plan; do not implement it as part of this work.
