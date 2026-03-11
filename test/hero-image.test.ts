import { describe, it, expect } from 'vitest';
import { selectHeroImage } from '../src/rendering.js';
import type { Photo, Gallery } from '../src/types.js';

/** Minimal photo stub with the fields selectHeroImage needs. */
function makePhoto(
  slug: string,
  gallerySlug: string,
  width: number,
  height: number,
): Photo {
  return {
    slug: `${gallerySlug}/${slug}`,
    gallerySlug,
    sourcePath: `/content/photos/${gallerySlug}/${slug}.jpg`,
    metadata: {
      title: slug,
      location: '',
      caption: '',
      tags: [],
      license: 'all-rights-reserved',
    },
    exif: {},
    variants: [{ width, height, path: `/assets/images/${gallerySlug}/${slug}-2400w.webp` }],
    thumbnailPath: `/assets/images/${gallerySlug}/${slug}-thumb.webp`,
  };
}

function makeGallery(slug: string, photos: Photo[]): Gallery {
  return {
    slug,
    title: slug,
    listed: true,
    photos,
  };
}

describe('selectHeroImage', () => {
  const landscape = makePhoto('sunset', 'travel', 2400, 1600);
  const portrait = makePhoto('tower', 'travel', 1600, 2400);
  const square = makePhoto('flower', 'nature', 2000, 2000);

  const gallery = makeGallery('travel', [landscape, portrait]);
  const natureGallery = makeGallery('nature', [square]);

  const recentPhotos = [
    { photo: portrait, gallery },
    { photo: landscape, gallery },
    { photo: square, gallery: natureGallery },
  ];

  it('returns configured hero image when set', () => {
    const result = selectHeroImage(recentPhotos, [gallery, natureGallery], 'travel/sunset');
    expect(result).toBeDefined();
    expect(result!.photo.slug).toBe('travel/sunset');
  });

  it('falls back to first landscape photo when no config', () => {
    const result = selectHeroImage(recentPhotos, [gallery, natureGallery], undefined);
    expect(result).toBeDefined();
    expect(result!.photo.slug).toBe('travel/sunset');
  });

  it('skips portrait and square photos in auto-selection', () => {
    const portraitOnly = [
      { photo: portrait, gallery },
      { photo: square, gallery: natureGallery },
    ];
    const result = selectHeroImage(portraitOnly, [gallery, natureGallery], undefined);
    expect(result).toBeUndefined();
  });

  it('returns undefined when no photos available', () => {
    const result = selectHeroImage([], [], undefined);
    expect(result).toBeUndefined();
  });

  it('returns undefined when configured hero image is not found', () => {
    const result = selectHeroImage(recentPhotos, [gallery], 'nonexistent/photo');
    // Falls back to auto-select
    expect(result).toBeDefined();
    expect(result!.photo.slug).toBe('travel/sunset');
  });

  it('skips photos with no variants', () => {
    const noVariants: Photo = {
      ...landscape,
      slug: 'travel/empty',
      variants: [],
    };
    const items = [{ photo: noVariants, gallery }];
    const result = selectHeroImage(items, [gallery], undefined);
    expect(result).toBeUndefined();
  });
});
