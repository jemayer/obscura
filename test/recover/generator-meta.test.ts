import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { cp, rm, readFile, symlink } from 'node:fs/promises';
import { build } from '../../src/build.js';

const FIXTURE_DIR = resolve(import.meta.dirname, '..', 'fixtures', 'site');
const WORK_DIR = resolve(import.meta.dirname, '..', 'fixtures', 'site-work-gen');
const THEME_SRC = resolve(
  import.meta.dirname,
  '..',
  '..',
  'themes',
  'editorial',
);

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
    const html = await readFile(
      resolve(WORK_DIR, 'dist', 'index.html'),
      'utf-8',
    );
    expect(html).toMatch(
      /<meta name="generator"[^>]*content="Obscura \d{8}-\d{2}:\d{2}:\d{2}"/u,
    );
    expect(html).toMatch(/data-theme="editorial"/u);
    expect(html).toMatch(/data-version="\d+\.\d+\.\d+"/u);
  });
});
