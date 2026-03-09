import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractShortcodes, resolveShortcodes, loadGalleryContent } from '../src/markdown.js';
import { SlugIndex } from '../src/slugs.js';

describe('extractShortcodes', () => {
  it('extracts photo shortcodes from content', () => {
    const content = 'Some text {{< photo "mono/rain" >}} more text {{< photo "sunset" >}}';
    expect(extractShortcodes(content)).toEqual(['mono/rain', 'sunset']);
  });

  it('returns empty array when no shortcodes present', () => {
    expect(extractShortcodes('Just regular text')).toEqual([]);
  });

  it('handles shortcodes with varying whitespace', () => {
    const content = '{{<  photo  "test"  >}}';
    expect(extractShortcodes(content)).toEqual(['test']);
  });
});

describe('resolveShortcodes', () => {
  it('resolves valid shortcode slugs', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');

    const resolved = resolveShortcodes(['mono/rain'], index, 'test.md');
    expect(resolved).toEqual(['mono/rain']);
  });

  it('resolves bare slugs when unambiguous', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');

    const resolved = resolveShortcodes(['rain'], index, 'test.md');
    expect(resolved).toEqual(['mono/rain']);
  });

  it('throws on non-existent photo slug', () => {
    const index = new SlugIndex();
    expect(() => resolveShortcodes(['nope'], index, 'test.md')).toThrow();
  });

  it('throws on ambiguous slug', () => {
    const index = new SlugIndex();
    index.register('mono', 'sunset.jpg', '/photos/mono/sunset.jpg');
    index.register('color', 'sunset.jpg', '/photos/color/sunset.jpg');

    expect(() => resolveShortcodes(['sunset'], index, 'test.md')).toThrow('Ambiguous');
  });
});

describe('loadGalleryContent', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'obscura-gallery-md-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns rendered HTML when index.md exists', async () => {
    await writeFile(join(tempDir, 'index.md'), '# Hello\n\nSome **bold** text.', 'utf-8');
    const result = await loadGalleryContent(tempDir, '');
    expect(result).toContain('<h1>Hello</h1>');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('returns undefined when index.md does not exist', async () => {
    const result = await loadGalleryContent(tempDir, '');
    expect(result).toBeUndefined();
  });

  it('returns undefined when gallery dir does not exist', async () => {
    const result = await loadGalleryContent(join(tempDir, 'nonexistent'), '');
    expect(result).toBeUndefined();
  });

  it('applies base path to links', async () => {
    await writeFile(join(tempDir, 'index.md'), '[About](/about/)', 'utf-8');
    const result = await loadGalleryContent(tempDir, '/portfolio');
    expect(result).toContain('href="/portfolio/about/"');
  });
});
