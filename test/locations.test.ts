import { describe, it, expect } from 'vitest';
import { buildLocationPages } from '../src/locations.js';
import type { Gallery, Photo } from '../src/types.js';

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    slug: 'gallery/photo',
    gallerySlug: 'gallery',
    sourcePath: '/tmp/photo.jpg',
    metadata: {
      title: 'Test',
      date: new Date('2024-01-01'),
      location: '',
      caption: '',
      tags: [],
    },
    exif: {},
    variants: [],
    thumbnailPath: '/tmp/thumb.jpg',
    ...overrides,
  };
}

function makeGallery(photos: Photo[], slug = 'gallery'): Gallery {
  return {
    slug,
    title: 'Test Gallery',
    listed: true,
    photos,
  };
}

describe('buildLocationPages', () => {
  it('groups photos by location (case-insensitive)', () => {
    const photos = [
      makePhoto({
        slug: 'gallery/a',
        metadata: { title: 'A', location: 'Berlin', caption: '', tags: [], date: new Date('2024-01-01') },
      }),
      makePhoto({
        slug: 'gallery/b',
        metadata: { title: 'B', location: 'berlin', caption: '', tags: [], date: new Date('2024-02-01') },
      }),
    ];
    const gallery = makeGallery(photos);
    const pages = buildLocationPages([gallery]);

    expect(pages).toHaveLength(1);
    expect(pages[0]!.location).toBe('berlin');
    expect(pages[0]!.photos).toHaveLength(2);
  });

  it('sorts photos by date descending within each location', () => {
    const photos = [
      makePhoto({
        slug: 'gallery/old',
        metadata: { title: 'Old', location: 'Paris', caption: '', tags: [], date: new Date('2023-01-01') },
      }),
      makePhoto({
        slug: 'gallery/new',
        metadata: { title: 'New', location: 'Paris', caption: '', tags: [], date: new Date('2024-06-01') },
      }),
    ];
    const gallery = makeGallery(photos);
    const pages = buildLocationPages([gallery]);

    expect(pages).toHaveLength(1);
    expect(pages[0]!.photos[0]!.photo.metadata.title).toBe('New');
    expect(pages[0]!.photos[1]!.photo.metadata.title).toBe('Old');
  });

  it('excludes photos with empty location', () => {
    const photos = [
      makePhoto({
        slug: 'gallery/a',
        metadata: { title: 'A', location: 'Berlin', caption: '', tags: [] },
      }),
      makePhoto({
        slug: 'gallery/b',
        metadata: { title: 'B', location: '', caption: '', tags: [] },
      }),
    ];
    const gallery = makeGallery(photos);
    const pages = buildLocationPages([gallery]);

    expect(pages).toHaveLength(1);
    expect(pages[0]!.photos).toHaveLength(1);
  });

  it('slugifies location names for URLs', () => {
    const photos = [
      makePhoto({
        slug: 'gallery/a',
        metadata: { title: 'A', location: 'Baltic Sea, Germany', caption: '', tags: [] },
      }),
    ];
    const gallery = makeGallery(photos);
    const pages = buildLocationPages([gallery]);

    expect(pages[0]!.slug).toBe('baltic-sea-germany');
  });

  it('returns alphabetically sorted location pages', () => {
    const photos = [
      makePhoto({
        slug: 'gallery/a',
        metadata: { title: 'A', location: 'Zurich', caption: '', tags: [] },
      }),
      makePhoto({
        slug: 'gallery/b',
        metadata: { title: 'B', location: 'Amsterdam', caption: '', tags: [] },
      }),
      makePhoto({
        slug: 'gallery/c',
        metadata: { title: 'C', location: 'Munich', caption: '', tags: [] },
      }),
    ];
    const gallery = makeGallery(photos);
    const pages = buildLocationPages([gallery]);

    expect(pages.map((p) => p.location)).toEqual(['amsterdam', 'munich', 'zurich']);
  });

  it('collects photos across multiple galleries', () => {
    const g1 = makeGallery(
      [makePhoto({ slug: 'g1/a', metadata: { title: 'A', location: 'Berlin', caption: '', tags: [] } })],
      'g1',
    );
    const g2 = makeGallery(
      [makePhoto({ slug: 'g2/b', metadata: { title: 'B', location: 'Berlin', caption: '', tags: [] } })],
      'g2',
    );
    const pages = buildLocationPages([g1, g2]);

    expect(pages).toHaveLength(1);
    expect(pages[0]!.photos).toHaveLength(2);
  });

  it('returns empty array when no photos have locations', () => {
    const photos = [
      makePhoto({ slug: 'gallery/a', metadata: { title: 'A', location: '', caption: '', tags: [] } }),
    ];
    const gallery = makeGallery(photos);
    const pages = buildLocationPages([gallery]);

    expect(pages).toHaveLength(0);
  });
});
