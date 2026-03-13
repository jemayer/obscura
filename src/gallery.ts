import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Gallery, GalleryEntry, Photo } from './types.js';
import { readExif } from './exif.js';
import type { ExifWarning } from './exif.js';
import { loadAndMergeMetadata } from './metadata.js';
import { isPhotoFile } from './sidecar.js';
import { SlugIndex } from './slugs.js';

export interface LoadGalleriesResult {
  readonly galleries: readonly Gallery[];
  readonly slugIndex: SlugIndex;
  readonly warnings: readonly ExifWarning[];
}

async function loadPhotosForGallery(
  gallerySlug: string,
  galleryDir: string,
  slugIndex: SlugIndex,
  warnings: ExifWarning[],
  defaultLicense: string,
): Promise<Photo[]> {
  let entries: string[];
  try {
    const dirEntries = await readdir(galleryDir);
    entries = dirEntries.filter(isPhotoFile).sort();
  } catch {
    return [];
  }

  const photos: Photo[] = [];

  for (const entry of entries) {
    const sourcePath = resolve(galleryDir, entry);
    const slug = slugIndex.register(gallerySlug, entry, sourcePath);

    const exifResult = await readExif(sourcePath);
    if (exifResult.warning) {
      warnings.push(exifResult.warning);
    }

    const metadata = await loadAndMergeMetadata(
      sourcePath,
      exifResult.data,
      defaultLicense,
    );

    photos.push({
      slug,
      gallerySlug,
      sourcePath,
      metadata,
      exif: exifResult.data,
      variants: [],
      thumbnailPath: '',
    });
  }

  photos.sort((a, b) => {
    const dateA = a.metadata.date ?? a.exif.date ?? new Date(0);
    const dateB = b.metadata.date ?? b.exif.date ?? new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  return photos;
}

export async function loadGalleries(
  photosDir: string,
  galleryEntries: readonly GalleryEntry[],
  defaultLicense: string = 'all-rights-reserved',
): Promise<LoadGalleriesResult> {
  const slugIndex = new SlugIndex();
  const warnings: ExifWarning[] = [];
  const galleries: Gallery[] = [];

  for (const entry of galleryEntries) {
    const galleryDir = resolve(photosDir, entry.slug);
    const photos = await loadPhotosForGallery(
      entry.slug,
      galleryDir,
      slugIndex,
      warnings,
      defaultLicense,
    );

    const gallery: Gallery = {
      slug: entry.slug,
      title: entry.title,
      listed: entry.listed,
      layout: entry.layout,
      photos,
    };
    if (entry.description !== undefined) {
      galleries.push({ ...gallery, description: entry.description });
    } else {
      galleries.push(gallery);
    }
  }

  return { galleries, slugIndex, warnings };
}
