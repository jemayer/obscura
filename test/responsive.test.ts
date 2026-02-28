import { describe, it, expect } from 'vitest';
import { srcset, sizes, bestVariant } from '../src/responsive.js';
import type { ImageVariant } from '../src/types.js';

const variants: readonly ImageVariant[] = [
  { width: 400, height: 267, path: '/img/photo-400w.webp' },
  { width: 800, height: 533, path: '/img/photo-800w.webp' },
  { width: 1200, height: 800, path: '/img/photo-1200w.webp' },
  { width: 2400, height: 1600, path: '/img/photo-2400w.webp' },
];

describe('srcset', () => {
  it('generates srcset string from variants', () => {
    const result = srcset(variants);
    expect(result).toBe(
      '/img/photo-400w.webp 400w, /img/photo-800w.webp 800w, /img/photo-1200w.webp 1200w, /img/photo-2400w.webp 2400w',
    );
  });

  it('returns empty string for no variants', () => {
    expect(srcset([])).toBe('');
  });
});

describe('sizes', () => {
  it('returns default sizes string', () => {
    expect(sizes()).toContain('100vw');
    expect(sizes()).toContain('2400px');
  });

  it('respects custom max width', () => {
    expect(sizes(1200)).toContain('1200px');
  });
});

describe('bestVariant', () => {
  it('returns the smallest variant >= target width', () => {
    expect(bestVariant(variants, 500)).toEqual({ width: 800, height: 533, path: '/img/photo-800w.webp' });
  });

  it('returns exact match when available', () => {
    expect(bestVariant(variants, 800)).toEqual({ width: 800, height: 533, path: '/img/photo-800w.webp' });
  });

  it('returns largest variant when target exceeds all', () => {
    expect(bestVariant(variants, 5000)).toEqual({ width: 2400, height: 1600, path: '/img/photo-2400w.webp' });
  });

  it('returns undefined for empty variants', () => {
    expect(bestVariant([], 800)).toBeUndefined();
  });
});
