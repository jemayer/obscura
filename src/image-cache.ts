import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { ImageConfig, ImageVariant } from './types.js';
import { processPhoto } from './image-processing.js';
import type { ProcessPhotoResult } from './image-processing.js';

const CACHE_DIR = '.cache';
const CACHE_FILENAME = 'image-cache.json';

interface CacheEntry {
  readonly hash: string;
  readonly variants: readonly ImageVariant[];
  readonly thumbnailPath: string;
}

interface CacheManifest {
  readonly entries: Record<string, CacheEntry>;
}

function emptyCacheManifest(): CacheManifest {
  return { entries: {} };
}

async function loadCacheManifest(projectDir: string): Promise<CacheManifest> {
  const cachePath = resolve(projectDir, CACHE_DIR, CACHE_FILENAME);
  try {
    const content = await readFile(cachePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && 'entries' in parsed) {
      return parsed as CacheManifest;
    }
    return emptyCacheManifest();
  } catch {
    return emptyCacheManifest();
  }
}

async function saveCacheManifest(
  projectDir: string,
  manifest: CacheManifest,
): Promise<void> {
  const cacheDir = resolve(projectDir, CACHE_DIR);
  await mkdir(cacheDir, { recursive: true });
  const cachePath = resolve(cacheDir, CACHE_FILENAME);
  await writeFile(cachePath, JSON.stringify(manifest, null, 2), 'utf-8');
}

async function computeFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function computeParamsHash(config: ImageConfig): string {
  const params = JSON.stringify({
    breakpoints: config.breakpoints,
    webp_quality: config.webp_quality,
  });
  return createHash('sha256').update(params).digest('hex');
}

function computeCacheKey(fileHash: string, paramsHash: string): string {
  return `${fileHash}:${paramsHash}`;
}

async function outputFilesExist(
  distDir: string,
  entry: CacheEntry,
): Promise<boolean> {
  try {
    for (const variant of entry.variants) {
      await access(resolve(distDir, variant.path.replace(/^\//, '')));
    }
    await access(resolve(distDir, entry.thumbnailPath.replace(/^\//, '')));
    return true;
  } catch {
    return false;
  }
}

export interface CachedProcessResult {
  readonly result: ProcessPhotoResult;
  readonly fromCache: boolean;
}

export async function processPhotoWithCache(
  sourcePath: string,
  photoSlug: string,
  gallerySlug: string,
  distDir: string,
  config: ImageConfig,
  manifest: CacheManifest,
): Promise<CachedProcessResult> {
  const fileHash = await computeFileHash(sourcePath);
  const paramsHash = computeParamsHash(config);
  const cacheKey = computeCacheKey(fileHash, paramsHash);

  const cached = manifest.entries[photoSlug];
  if (
    cached &&
    cached.hash === cacheKey &&
    (await outputFilesExist(distDir, cached))
  ) {
    return {
      result: {
        variants: cached.variants,
        thumbnailPath: cached.thumbnailPath,
      },
      fromCache: true,
    };
  }

  const result = await processPhoto(sourcePath, gallerySlug, distDir, config);

  return { result, fromCache: false };
}

export async function processAllPhotosWithCache(
  photos: readonly {
    readonly slug: string;
    readonly gallerySlug: string;
    readonly sourcePath: string;
  }[],
  projectDir: string,
  distDir: string,
  config: ImageConfig,
): Promise<Map<string, ProcessPhotoResult>> {
  const manifest = await loadCacheManifest(projectDir);
  const results = new Map<string, ProcessPhotoResult>();
  const newEntries: Record<string, CacheEntry> = { ...manifest.entries };
  let cacheHits = 0;

  for (const photo of photos) {
    const { result, fromCache } = await processPhotoWithCache(
      photo.sourcePath,
      photo.slug,
      photo.gallerySlug,
      distDir,
      config,
      manifest,
    );

    results.set(photo.slug, result);

    if (fromCache) {
      cacheHits++;
    } else {
      const fileHash = await computeFileHash(photo.sourcePath);
      const paramsHash = computeParamsHash(config);
      newEntries[photo.slug] = {
        hash: computeCacheKey(fileHash, paramsHash),
        variants: result.variants,
        thumbnailPath: result.thumbnailPath,
      };
    }
  }

  const newManifest: CacheManifest = { entries: newEntries };
  await saveCacheManifest(projectDir, newManifest);

  if (cacheHits > 0) {
    const total = photos.length;
    console.log(
      `Image cache: ${String(cacheHits)}/${String(total)} photos skipped (unchanged)`,
    );
  }

  return results;
}
