import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import {
  cp,
  rm,
  readFile,
  mkdtemp,
  symlink,
  readdir,
} from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
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
import { gallerySlugsFromPhotoUrls } from '../../src/recover/sitemap.js';
import {
  writeSiteConfig,
  writeGalleriesConfig,
  writeSidecar,
} from '../../src/recover/write.js';
import { downloadImage } from '../../src/recover/download-image.js';
import type { GalleryEntry } from '../../src/types.js';

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
    res.writeHead(200, {
      'content-type': types[ext] ?? 'application/octet-stream',
    });
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
  it('identifies, categorises sitemap, parses pages, and writes a buildable project', async () => {
    // Identify
    const landing = await fetchText(`${baseUrl}/`);
    const id = identifyFromHtml(landing);
    expect(id.theme).toBe('editorial');
    expect(id.version).not.toBeNull();

    // Parse homepage. og:url reflects fixture's https://test.example.com,
    // but we need to fetch against the local server.
    const homepage = parseHomepage(landing, id.theme);
    const siteCfg = { ...homepage.value, base_url: baseUrl };

    // Sitemap
    const sitemap = await fetchText(`${baseUrl}/sitemap.xml`);
    // Replace the fixture's base_url with the test server's so categorise can match
    const localSitemap = sitemap.replaceAll(
      'https://test.example.com',
      baseUrl,
    );
    const urls = categoriseSitemap(localSitemap, baseUrl);
    expect(urls.photos.length).toBeGreaterThan(0);
    expect(urls.galleries.length).toBeGreaterThan(0);

    // Listed-gallery discovery
    const listedSlugs = urls.galleryIndex
      ? parseGalleryIndex(await fetchText(urls.galleryIndex), baseUrl)
      : new Set<string>();

    // Galleries (mirrors orchestrator: parse index URLs, then synthesize unlisted)
    const galleries: GalleryEntry[] = [];
    const parsedSlugs = new Set<string>();
    for (const u of urls.galleries) {
      const parsed = parseGalleryPage(await fetchText(u), u, listedSlugs);
      galleries.push(parsed.value.entry);
      parsedSlugs.add(parsed.value.entry.slug);
    }
    const allGallerySlugs = gallerySlugsFromPhotoUrls(urls.photos, baseUrl);
    for (const slug of allGallerySlugs) {
      if (parsedSlugs.has(slug)) continue;
      galleries.push({ slug, title: slug, listed: false });
    }
    expect(galleries.length).toBeGreaterThan(0);
    expect(galleries.map((g) => g.slug).sort()).toContain('post-assets');

    // Photos
    for (const u of urls.photos) {
      const parsed = parsePhotoPage(await fetchText(u), u);
      const { gallerySlug, photoSlug, metadata, imageUrl, imageExt } =
        parsed.value;
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

    // Site & galleries config
    await writeSiteConfig(recoverDir, siteCfg);
    await writeGalleriesConfig(recoverDir, galleries);

    // -- Assertions --
    const recoveredSite = parseYaml(
      await readFile(
        resolve(recoverDir, 'site', 'config', 'site.yaml'),
        'utf-8',
      ),
    ) as { title: string; theme: string };
    const originalSite = parseYaml(
      await readFile(
        resolve(FIXTURE_DIR, 'site', 'config', 'site.yaml'),
        'utf-8',
      ),
    ) as { title: string; theme: string };
    expect(recoveredSite.theme).toBe(originalSite.theme);
    expect(recoveredSite.title).toBe(originalSite.title);

    // Every original photo has a recovered sidecar
    const photosRoot = resolve(
      FIXTURE_DIR,
      'site',
      'content',
      'photos',
      'test-gallery',
    );
    const originalPhotos = await readdir(photosRoot);
    const yamlFiles = originalPhotos.filter((f) => f.endsWith('.yaml'));
    for (const yamlFile of yamlFiles) {
      const recoveredPath = resolve(
        recoverDir,
        'site',
        'content',
        'photos',
        'test-gallery',
        yamlFile,
      );
      expect(
        existsSync(recoveredPath),
        `missing sidecar for ${yamlFile}`,
      ).toBe(true);
    }
  }, 60_000);
});
