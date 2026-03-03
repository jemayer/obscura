import { describe, it, expect } from 'vitest';
import { extractBasePath } from '../src/config.js';
import { prefixedSrcset } from '../src/responsive.js';
import type { ImageVariant } from '../src/types.js';

describe('extractBasePath', () => {
  it('returns empty string for root URL', () => {
    expect(extractBasePath('https://example.com')).toBe('');
  });

  it('returns empty string for root URL with trailing slash', () => {
    expect(extractBasePath('https://example.com/')).toBe('');
  });

  it('extracts single-level subpath', () => {
    expect(extractBasePath('https://example.com/portfolio')).toBe('/portfolio');
  });

  it('strips trailing slash from subpath', () => {
    expect(extractBasePath('https://example.com/portfolio/')).toBe('/portfolio');
  });

  it('extracts multi-level subpath', () => {
    expect(extractBasePath('https://example.com/user/site')).toBe('/user/site');
  });

  it('strips multiple trailing slashes', () => {
    expect(extractBasePath('https://example.com/portfolio///')).toBe('/portfolio');
  });

  it('returns empty string for malformed URL', () => {
    expect(extractBasePath('not-a-url')).toBe('');
  });

  it('handles GitHub Pages style URL', () => {
    expect(extractBasePath('https://username.github.io/repo-name/')).toBe('/repo-name');
  });
});

describe('prefixedSrcset', () => {
  const variants: readonly ImageVariant[] = [
    { width: 400, height: 267, path: '/assets/images/photo-400w.webp' },
    { width: 800, height: 533, path: '/assets/images/photo-800w.webp' },
  ];

  it('prepends base path to each variant', () => {
    const result = prefixedSrcset(variants, '/portfolio');
    expect(result).toBe(
      '/portfolio/assets/images/photo-400w.webp 400w, /portfolio/assets/images/photo-800w.webp 800w',
    );
  });

  it('works with empty base path', () => {
    const result = prefixedSrcset(variants, '');
    expect(result).toBe(
      '/assets/images/photo-400w.webp 400w, /assets/images/photo-800w.webp 800w',
    );
  });

  it('returns empty string for no variants', () => {
    expect(prefixedSrcset([], '/portfolio')).toBe('');
  });
});
