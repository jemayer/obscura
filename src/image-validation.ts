import { readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.tiff',
  '.tif',
  '.webp',
]);

export class UnsupportedImageFormatError extends Error {
  readonly filePath: string;

  constructor(filePath: string) {
    super(
      `Unsupported image format: ${filePath}. Please export to JPEG, PNG, TIFF, or WebP.`,
    );
    this.name = 'UnsupportedImageFormatError';
    this.filePath = filePath;
  }
}

function isImageLikeFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  // Skip hidden files, YAML sidecars, and .gitkeep
  if (
    filename.startsWith('.') ||
    ext === '.yaml' ||
    ext === '.yml' ||
    ext === ''
  ) {
    return false;
  }
  return true;
}

function isSupportedFormat(filename: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(filename).toLowerCase());
}

export async function validateGalleryFormats(
  galleryDir: string,
): Promise<void> {
  let entries: string[];
  try {
    const dirEntries = await readdir(galleryDir);
    entries = dirEntries.filter(isImageLikeFile);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!isSupportedFormat(entry)) {
      throw new UnsupportedImageFormatError(resolve(galleryDir, entry));
    }
  }
}

export async function validateAllGalleryFormats(
  photosDir: string,
  gallerySlugs: readonly string[],
): Promise<void> {
  for (const slug of gallerySlugs) {
    await validateGalleryFormats(resolve(photosDir, slug));
  }
}
