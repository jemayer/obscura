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
