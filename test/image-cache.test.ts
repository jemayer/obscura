import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { mkdir, rm, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { processAllPhotosWithCache } from '../src/image-cache.js';
import type { ImageConfig } from '../src/types.js';

const WORK_DIR = resolve(import.meta.dirname, 'fixtures', 'image-cache-work');
const DIST_DIR = resolve(WORK_DIR, 'dist');
const SOURCE = resolve(WORK_DIR, 'wide.jpg');

const CONFIG: ImageConfig = {
  breakpoints: [400, 800, 1200, 2400],
  webp_quality: 85,
  max_dimension: 2400,
};

const PHOTOS = [
  { slug: 'wide', gallerySlug: 'test', sourcePath: SOURCE },
];

function largestWidth(variants: readonly { readonly width: number }[]): number {
  return Math.max(...variants.map((v) => v.width));
}

beforeAll(async () => {
  await rm(WORK_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });
  await sharp({
    create: {
      width: 6000,
      height: 4000,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  })
    .jpeg()
    .toFile(SOURCE);
});

afterAll(async () => {
  await rm(WORK_DIR, { recursive: true, force: true });
});

describe('image cache', () => {
  it('invalidates cached variants when max_dimension changes', async () => {
    const first = await processAllPhotosWithCache(
      PHOTOS,
      WORK_DIR,
      DIST_DIR,
      CONFIG,
    );
    expect(largestWidth(first.get('wide')!.variants)).toBe(2400);

    // Same source, same breakpoints — only the cap differs.
    const second = await processAllPhotosWithCache(PHOTOS, WORK_DIR, DIST_DIR, {
      ...CONFIG,
      max_dimension: 1600,
    });
    expect(largestWidth(second.get('wide')!.variants)).toBe(1600);
  });

  it('reuses cached variants when nothing changes', async () => {
    const config = { ...CONFIG, max_dimension: 1600 };
    const first = await processAllPhotosWithCache(
      PHOTOS,
      WORK_DIR,
      DIST_DIR,
      config,
    );
    const variantPath = resolve(
      DIST_DIR,
      first.get('wide')!.variants[0]!.path.replace(/^\//, ''),
    );
    const before = await stat(variantPath);

    const again = await processAllPhotosWithCache(
      PHOTOS,
      WORK_DIR,
      DIST_DIR,
      config,
    );
    expect(largestWidth(again.get('wide')!.variants)).toBe(1600);
    // Untouched on disk — the second run served the cache rather than re-encoding.
    expect((await stat(variantPath)).mtimeMs).toBe(before.mtimeMs);
  });
});
