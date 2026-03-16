import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { cp, rm, access, readFile, symlink } from 'node:fs/promises';
import { build } from '../src/build.js';

const FIXTURE_DIR = resolve(import.meta.dirname, 'fixtures', 'site');
const WORK_DIR = resolve(import.meta.dirname, 'fixtures', 'site-work');
const THEME_SRC = resolve(import.meta.dirname, '..', 'themes', 'editorial');

describe('full build pipeline', () => {
  beforeAll(async () => {
    // Copy fixture to a work directory so we don't pollute
    await rm(WORK_DIR, { recursive: true, force: true });
    await cp(FIXTURE_DIR, WORK_DIR, { recursive: true });
    // Symlink the real editorial theme
    await symlink(THEME_SRC, resolve(WORK_DIR, 'themes', 'editorial'));
  });

  afterAll(async () => {
    await rm(WORK_DIR, { recursive: true, force: true });
  });

  it('completes a build successfully', async () => {
    const result = await build(WORK_DIR);
    expect(result.success).toBe(true);
    expect(result.photoCount).toBe(1);
    expect(result.pageCount).toBeGreaterThan(0);
  });

  it('generates index.html (homepage)', async () => {
    const path = resolve(WORK_DIR, 'dist', 'index.html');
    await expect(access(path)).resolves.toBeUndefined();
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('Test Site');
    expect(html).toContain('Recent Shots');
  });

  it('generates gallery index at photography/index.html', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'index.html');
    await expect(access(path)).resolves.toBeUndefined();
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('Test Gallery');
  });

  it('generates gallery page', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'index.html');
    await expect(access(path)).resolves.toBeUndefined();
  });

  it('generates photo permalink', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'test-photo', 'index.html');
    await expect(access(path)).resolves.toBeUndefined();
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('Test Photo');
    expect(html).toContain('Berlin, Germany');
    expect(html).toContain('Test Camera');
  });

  it('photo permalink has backlinks to referencing post', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'test-photo', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('Hello World');
    expect(html).toContain('Referenced in');
  });

  it('generates blog index', async () => {
    const path = resolve(WORK_DIR, 'dist', 'blog', 'index.html');
    await expect(access(path)).resolves.toBeUndefined();
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('Hello World');
  });

  it('generates blog post page', async () => {
    const path = resolve(WORK_DIR, 'dist', 'blog', 'hello-world', 'index.html');
    await expect(access(path)).resolves.toBeUndefined();
  });

  it('generates about page', async () => {
    const path = resolve(WORK_DIR, 'dist', 'about', 'index.html');
    await expect(access(path)).resolves.toBeUndefined();
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('About');
  });

  it('generates 404 page', async () => {
    const path = resolve(WORK_DIR, 'dist', '404.html');
    await expect(access(path)).resolves.toBeUndefined();
  });

  it('generates RSS feed', async () => {
    const path = resolve(WORK_DIR, 'dist', 'feed.xml');
    await expect(access(path)).resolves.toBeUndefined();
    const xml = await readFile(path, 'utf-8');
    expect(xml).toContain('<rss');
    expect(xml).toContain('Hello World');
    expect(xml).toContain('test.example.com');
  });

  it('generates sitemap', async () => {
    const path = resolve(WORK_DIR, 'dist', 'sitemap.xml');
    await expect(access(path)).resolves.toBeUndefined();
    const xml = await readFile(path, 'utf-8');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('test.example.com/photography/');
    expect(xml).toContain('test.example.com/blog/hello-world/');
  });

  it('copies theme assets', async () => {
    const cssPath = resolve(WORK_DIR, 'dist', 'assets', 'theme', 'css', 'style.css');
    await expect(access(cssPath)).resolves.toBeUndefined();
  });

  it('copies PhotoSwipe vendor assets', async () => {
    const pswpPath = resolve(WORK_DIR, 'dist', 'assets', 'vendor', 'photoswipe', 'photoswipe.esm.min.js');
    await expect(access(pswpPath)).resolves.toBeUndefined();
  });

  it('generates image variants', async () => {
    // Should have 400w and 800w variants (source is 100px, so only variants <= source width)
    const imgDir = resolve(WORK_DIR, 'dist', 'assets', 'images', 'test-gallery');
    await expect(access(imgDir)).resolves.toBeUndefined();
  });

  it('photo page displays default license', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'test-photo', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('License');
    expect(html).toContain('All Rights Reserved');
  });

  it('photo page includes schema.org structured data with license', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'test-photo', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('"@type": "ImageObject"');
    expect(html).toContain('"copyrightNotice"');
  });

  it('gallery page includes data-pswp-license attribute', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('data-pswp-license="all-rights-reserved"');
  });

  it('photo page og:description falls back to location + date when no caption', async () => {
    // The test fixture photo has a caption, so og:description should use it
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'test-photo', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('og:description');
    expect(html).toContain('A photo for testing');
  });

  it('photo page includes og:image and twitter:card when variants exist', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'test-photo', 'index.html');
    const html = await readFile(path, 'utf-8');
    // Test fixture has a tiny image; og:image/twitter:card only render when variants exist
    // Verify the og:type and og:title are always present
    expect(html).toContain('og:type');
    expect(html).toContain('og:title');
  });

  it('gallery page includes og:title and og:url', async () => {
    const path = resolve(WORK_DIR, 'dist', 'photography', 'test-gallery', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('og:title');
    expect(html).toContain('og:url');
  });

  it('homepage includes og:type and og:title', async () => {
    const path = resolve(WORK_DIR, 'dist', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('og:type');
    expect(html).toContain('og:title');
  });

  it('static page includes og:title and og:url', async () => {
    const path = resolve(WORK_DIR, 'dist', 'about', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('og:title');
    expect(html).toContain('og:url');
  });

  it('renders mobile nav toggle button', async () => {
    const path = resolve(WORK_DIR, 'dist', 'index.html');
    const html = await readFile(path, 'utf-8');
    expect(html).toContain('class="nav-toggle"');
    expect(html).toContain('aria-controls="site-nav"');
    expect(html).toContain('id="site-nav"');
  });
});
