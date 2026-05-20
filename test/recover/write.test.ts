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
      resolve(
        workDir,
        'site',
        'content',
        'photos',
        'sample',
        'sample-01.yaml',
      ),
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
