import { mkdir } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import sharp from 'sharp';
import type { ImageConfig, ImageVariant, Photo } from './types.js';

const THUMBNAIL_WIDTH = 400;

function outputDir(distDir: string, gallerySlug: string): string {
  return resolve(distDir, 'assets', 'images', gallerySlug);
}

function variantFilename(photoBasename: string, width: number): string {
  return `${photoBasename}-${String(width)}w.webp`;
}

function thumbnailFilename(photoBasename: string): string {
  return `${photoBasename}-thumb.webp`;
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export interface ProcessPhotoResult {
  readonly variants: readonly ImageVariant[];
  readonly thumbnailPath: string;
}

export async function processPhoto(
  sourcePath: string,
  gallerySlug: string,
  distDir: string,
  config: ImageConfig,
): Promise<ProcessPhotoResult> {
  const photoBase = basename(sourcePath, extname(sourcePath));
  const outDir = outputDir(distDir, gallerySlug);
  await ensureDir(outDir);

  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const sourceWidth: number = metadata.width as number | undefined ?? 0;

  const variants: ImageVariant[] = [];

  for (const breakpoint of config.breakpoints) {
    // Skip breakpoints larger than the source image
    if (breakpoint > sourceWidth && sourceWidth > 0) {
      continue;
    }

    const filename = variantFilename(photoBase, breakpoint);
    const outPath = resolve(outDir, filename);

    await sharp(sourcePath)
      .resize(breakpoint, undefined, { withoutEnlargement: true })
      .webp({ quality: config.webp_quality })
      .toFile(outPath);

    variants.push({
      width: breakpoint,
      path: `/assets/images/${gallerySlug}/${filename}`,
    });
  }

  // Always generate the full-size variant if source is larger than all breakpoints
  const maxBreakpoint = Math.max(...config.breakpoints);
  if (sourceWidth > maxBreakpoint) {
    const filename = variantFilename(photoBase, sourceWidth);
    const outPath = resolve(outDir, filename);

    await sharp(sourcePath)
      .webp({ quality: config.webp_quality })
      .toFile(outPath);

    variants.push({
      width: sourceWidth,
      path: `/assets/images/${gallerySlug}/${filename}`,
    });
  }

  // Generate thumbnail
  const thumbFilename = thumbnailFilename(photoBase);
  const thumbPath = resolve(outDir, thumbFilename);

  await sharp(sourcePath)
    .resize(THUMBNAIL_WIDTH, undefined, { withoutEnlargement: true })
    .webp({ quality: config.webp_quality })
    .toFile(thumbPath);

  const thumbnailWebPath = `/assets/images/${gallerySlug}/${thumbFilename}`;

  return { variants, thumbnailPath: thumbnailWebPath };
}

export async function processAllPhotos(
  galleries: readonly Photo[][],
  gallerySlugs: readonly string[],
  distDir: string,
  config: ImageConfig,
): Promise<Map<string, ProcessPhotoResult>> {
  const results = new Map<string, ProcessPhotoResult>();

  for (let i = 0; i < galleries.length; i++) {
    const photos = galleries[i];
    const gallerySlug = gallerySlugs[i];
    if (!photos || !gallerySlug) continue;

    for (const photo of photos) {
      const result = await processPhoto(
        photo.sourcePath,
        gallerySlug,
        distDir,
        config,
      );
      results.set(photo.slug, result);
    }
  }

  return results;
}
