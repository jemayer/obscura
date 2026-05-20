import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePhotoPage } from '../../src/recover/parse-photo.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parsePhotoPage', () => {
  it('extracts every field from a fully populated page', () => {
    const html = fixture('photo-full.html');
    const result = parsePhotoPage(
      html,
      'https://example.com/photography/sample/sample-01/',
    );
    expect(result.value.gallerySlug).toBe('sample');
    expect(result.value.photoSlug).toBe('sample-01');
    expect(result.value.metadata).toMatchObject({
      title: 'The BRXTN Photographer',
      caption:
        'The creator of Obscura, caught in the act of finishing a roll.',
      camera: 'Canon AE-1',
      lens: 'Canon FD 50mm 1:1.8',
      focal_length: 50,
      aperture: 1.8,
      iso: 100,
      shutter_speed: '1/200',
      location: 'Hamburg, Germany',
      photographer: 'Jane Roe',
      license: 'CC-BY-4.0',
      tags: ['monochrome', 'people'],
    });
    expect(result.value.metadata.date).toEqual(new Date('2017-07-02'));
    expect(result.value.imageUrl).toBe(
      'https://example.com/img/photos/sample/sample-01-2400.webp',
    );
    expect(result.value.imageExt).toBe('.webp');
    expect(result.warnings).toHaveLength(0);
  });

  it('emits only the title when no other metadata is present', () => {
    const html = fixture('photo-minimal.html');
    const result = parsePhotoPage(
      html,
      'https://example.com/photography/sample/lonely/',
    );
    expect(result.value.metadata).toEqual({ title: 'Lonely' });
    expect(result.value.imageUrl).toBe(
      'https://example.com/img/photos/sample/lonely.jpg',
    );
  });

  it('extracts only the matched parts of a partial settings line', () => {
    const html = fixture('photo-partial-settings.html');
    const result = parsePhotoPage(
      html,
      'https://example.com/photography/sample/partial/',
    );
    expect(result.value.metadata.aperture).toBe(1.8);
    expect(result.value.metadata.iso).toBe(100);
    expect(result.value.metadata.focal_length).toBeUndefined();
    expect(result.value.metadata.shutter_speed).toBeUndefined();
  });
});
