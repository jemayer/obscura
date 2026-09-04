import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { mkdir, rm, readdir, access } from 'node:fs/promises';
import sharp from 'sharp';
import { processPhoto } from '../src/image-processing.js';
import { srcset } from '../src/responsive.js';
import type { ImageConfig } from '../src/types.js';

const WORK_DIR = resolve(
  import.meta.dirname,
  'fixtures',
  'image-processing-work',
);
const SRC_DIR = resolve(WORK_DIR, 'src');
const DIST_DIR = resolve(WORK_DIR, 'dist');

const CONFIG: ImageConfig = {
  breakpoints: [400, 800, 1200, 2400],
  webp_quality: 85,
  max_dimension: 2400,
};

async function makeSource(
  name: string,
  width: number,
  height: number,
): Promise<string> {
  const path = resolve(SRC_DIR, `${name}.jpg`);
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 90, g: 120, b: 150 },
    },
  })
    .jpeg()
    .toFile(path);
  return path;
}

/** Shorthand "WxH" descriptors for the variants of a processed photo. */
function dims(
  variants: readonly { readonly width: number; readonly height: number }[],
): string[] {
  return variants.map((v) => `${String(v.width)}x${String(v.height)}`);
}

beforeAll(async () => {
  await rm(WORK_DIR, { recursive: true, force: true });
  await mkdir(SRC_DIR, { recursive: true });
  await mkdir(DIST_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(WORK_DIR, { recursive: true, force: true });
});

describe('processPhoto — variant generation', () => {
  const cases: {
    name: string;
    width: number;
    height: number;
    expected: string[];
  }[] = [
    {
      name: 'landscape-6000',
      width: 6000,
      height: 4000,
      expected: ['400x267', '800x533', '1200x800', '2400x1600'],
    },
    {
      name: 'portrait-4000',
      width: 4000,
      height: 6000,
      expected: ['400x600', '800x1200', '1200x1800', '1600x2400'],
    },
    {
      name: 'landscape-2048',
      width: 2048,
      height: 1365,
      // 2048x1365 is not exactly 3:2, so 400w rounds to 266 rather than 267.
      expected: ['400x266', '800x533', '1200x800', '2048x1365'],
    },
    {
      name: 'portrait-683',
      width: 683,
      height: 2048,
      expected: ['400x1199', '683x2048'],
    },
    {
      name: 'panorama-tall',
      width: 2400,
      height: 7200,
      expected: ['400x1200', '800x2400'],
    },
    {
      name: 'square-3000',
      width: 3000,
      height: 3000,
      expected: ['400x400', '800x800', '1200x1200', '2400x2400'],
    },
    {
      name: 'tiny-300',
      width: 300,
      height: 200,
      expected: ['300x200'],
    },
  ];

  for (const c of cases) {
    it(`${c.name} (${String(c.width)}x${String(c.height)}) produces ${c.expected.join(', ')}`, async () => {
      const source = await makeSource(c.name, c.width, c.height);
      const result = await processPhoto(source, c.name, DIST_DIR, CONFIG);
      expect(dims(result.variants)).toEqual(c.expected);
    });
  }

  it('never emits a variant whose longest side exceeds max_dimension', async () => {
    const source = await makeSource('cap-check', 5000, 8000);
    const result = await processPhoto(source, 'cap-check', DIST_DIR, CONFIG);
    for (const v of result.variants) {
      expect(Math.max(v.width, v.height)).toBeLessThanOrEqual(
        CONFIG.max_dimension,
      );
    }
  });

  it('never enlarges a source that already fits within the cap', async () => {
    const source = await makeSource('within-cap', 1000, 700);
    const result = await processPhoto(source, 'within-cap', DIST_DIR, CONFIG);
    expect(dims(result.variants)).toEqual(['400x280', '800x560', '1000x700']);
  });

  it('produces no duplicate variant when the source width sits on a breakpoint', async () => {
    const source = await makeSource('on-breakpoint', 1200, 2048);
    const result = await processPhoto(source, 'on-breakpoint', DIST_DIR, CONFIG);
    expect(dims(result.variants)).toEqual(['400x683', '800x1365', '1200x2048']);
  });

  it('emits a renderable variant for a source smaller than every breakpoint', async () => {
    const source = await makeSource('below-breakpoints', 300, 200);
    const result = await processPhoto(
      source,
      'below-breakpoints',
      DIST_DIR,
      CONFIG,
    );
    expect(result.variants.length).toBe(1);
    await access(
      resolve(DIST_DIR, result.variants[0]!.path.replace(/^\//, '')),
    );
  });

  it('honours a custom max_dimension', async () => {
    const source = await makeSource('custom-cap', 6000, 4000);
    const result = await processPhoto(source, 'custom-cap', DIST_DIR, {
      ...CONFIG,
      max_dimension: 1600,
    });
    expect(dims(result.variants)).toEqual(['400x267', '800x533', '1200x800', '1600x1067']);
  });

  it('writes variant files whose names match their actual width', async () => {
    const source = await makeSource('honest-names', 2048, 1365);
    const result = await processPhoto(source, 'honest-names', DIST_DIR, CONFIG);
    for (const v of result.variants) {
      expect(v.path.endsWith(`-${String(v.width)}w.webp`)).toBe(true);
      await access(resolve(DIST_DIR, v.path.replace(/^\//, '')));
    }
  });

  it('produces a srcset that is ascending and free of duplicate descriptors', async () => {
    const source = await makeSource('srcset-check', 683, 2048);
    const result = await processPhoto(source, 'srcset-check', DIST_DIR, CONFIG);
    const widths = result.variants.map((v) => v.width);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    expect(new Set(widths).size).toBe(widths.length);
    expect(srcset(result.variants)).toBe(
      '/assets/images/srcset-check/srcset-check-400w.webp 400w, ' +
        '/assets/images/srcset-check/srcset-check-683w.webp 683w',
    );
  });

  it('leaves the 400px thumbnail unaffected by the cap', async () => {
    const source = await makeSource('thumb-check', 6000, 4000);
    const result = await processPhoto(source, 'thumb-check', DIST_DIR, CONFIG);
    expect(result.thumbnailPath).toBe(
      '/assets/images/thumb-check/thumb-check-thumb.webp',
    );
    const meta = await sharp(
      resolve(DIST_DIR, result.thumbnailPath.replace(/^\//, '')),
    ).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(267);
  });

  it('writes exactly the variant and thumbnail files it reports', async () => {
    const source = await makeSource('file-count', 2048, 1365);
    const result = await processPhoto(source, 'file-count', DIST_DIR, CONFIG);
    const files = await readdir(
      resolve(DIST_DIR, 'assets', 'images', 'file-count'),
    );
    expect(files.sort()).toEqual(
      [
        'file-count-400w.webp',
        'file-count-800w.webp',
        'file-count-1200w.webp',
        'file-count-2048w.webp',
        'file-count-thumb.webp',
      ].sort(),
    );
    expect(result.variants.length).toBe(4);
  });
});
