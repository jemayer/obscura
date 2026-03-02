import { resolve } from 'node:path';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { loadSiteConfig, loadGalleryConfig } from './config.js';
import { generateAllSidecars } from './sidecar.js';
import { validateAllGalleryFormats } from './image-validation.js';
import { loadGalleries } from './gallery.js';
import { loadAllBlogPosts, loadAllPages, loadHomepageContent } from './markdown.js';
import { buildCrossReferenceGraph } from './crossref.js';
import { buildTagPages } from './tags.js';
import { buildLocationPages } from './locations.js';
import { processAllPhotosWithCache } from './image-cache.js';
import { formatExifWarnings } from './exif.js';
import { loadTheme, copyThemeAssets } from './theme.js';
import { copyPhotoSwipeAssets } from './photoswipe.js';
import { createRenderingEngine, renderAll } from './rendering.js';
import type { BuildContext, Gallery, Photo } from './types.js';

// ---------------------------------------------------------------------------
// Build result
// ---------------------------------------------------------------------------

export interface BuildResult {
  readonly success: boolean;
  readonly warnings: readonly string[];
  readonly pageCount: number;
  readonly photoCount: number;
  readonly durationMs: number;
}

// ---------------------------------------------------------------------------
// Full build pipeline
// ---------------------------------------------------------------------------

export interface BuildOptions {
  readonly clean?: boolean;
}

export async function build(
  projectDir: string,
  options: BuildOptions = {},
): Promise<BuildResult> {
  const startTime = performance.now();
  const warnings: string[] = [];

  // -- 1. Load configuration --
  const siteConfig = await loadSiteConfig(projectDir);
  const galleryConfig = await loadGalleryConfig(projectDir);

  // -- 2. Resolve directories --
  const photosDir = resolve(projectDir, 'content', 'photos');
  const postsDir = resolve(projectDir, 'content', 'posts');
  const pagesDir = resolve(projectDir, 'content', 'pages');
  const themesDir = resolve(projectDir, 'themes');
  const distDir = resolve(projectDir, 'dist');

  // -- 3. Clean dist --
  if (options.clean) {
    // Full wipe: remove dist/ and .cache/ entirely
    await rm(distDir, { recursive: true, force: true });
    await rm(resolve(projectDir, '.cache'), { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
  } else {
    // Incremental: preserve dist/assets/images/ for cache hits
    const imagesDir = resolve(distDir, 'assets', 'images');
    try {
      const entries = await readdir(distDir);
      for (const entry of entries) {
        if (entry === 'assets') continue;
        await rm(resolve(distDir, entry), { recursive: true, force: true });
      }
      // Clean non-image assets (theme, vendor) but keep images/
      const assetsDir = resolve(distDir, 'assets');
      const assetEntries = await readdir(assetsDir);
      for (const entry of assetEntries) {
        if (entry === 'images') continue;
        await rm(resolve(assetsDir, entry), { recursive: true, force: true });
      }
    } catch {
      // dist/ doesn't exist yet — that's fine
    }
    await mkdir(imagesDir, { recursive: true });
  }

  // -- 4. Validate image formats (hard error on unsupported) --
  const gallerySlugs = galleryConfig.galleries.map((g) => g.slug);
  await validateAllGalleryFormats(photosDir, gallerySlugs);

  // -- 5. Generate sidecars for photos without them --
  const sidecarResult = await generateAllSidecars(photosDir, gallerySlugs);
  if (sidecarResult.warnings.length > 0) {
    warnings.push(formatExifWarnings(sidecarResult.warnings));
  }

  // -- 6. Load galleries (EXIF + sidecars → metadata, slug index) --
  const { galleries, slugIndex, warnings: galleryWarnings } = await loadGalleries(
    photosDir,
    galleryConfig.galleries,
  );
  if (galleryWarnings.length > 0) {
    warnings.push(formatExifWarnings(galleryWarnings));
  }

  // -- 7. Load blog posts (with shortcode resolution) --
  const posts = await loadAllBlogPosts(postsDir, slugIndex);

  // -- 8. Load pages and optional homepage content --
  const pages = await loadAllPages(pagesDir);
  const homepageContent = await loadHomepageContent(pagesDir);

  // -- 9. Build cross-reference graph --
  const crossReferences = buildCrossReferenceGraph(posts);

  // -- 10. Process images (resize, WebP, thumbnails, with cache) --
  const allPhotos = galleries.flatMap((g) =>
    g.photos.map((p) => ({
      slug: p.slug,
      gallerySlug: p.gallerySlug,
      sourcePath: p.sourcePath,
    })),
  );
  const imageResults = await processAllPhotosWithCache(
    allPhotos,
    projectDir,
    distDir,
    siteConfig.images,
  );

  // -- 11. Attach image variants back to photos --
  const galleriesWithImages: Gallery[] = galleries.map((gallery) => ({
    ...gallery,
    photos: gallery.photos.map((photo): Photo => {
      const result = imageResults.get(photo.slug);
      if (result) {
        return {
          ...photo,
          variants: result.variants,
          thumbnailPath: result.thumbnailPath,
        };
      }
      return photo;
    }),
  }));

  // -- 12. Load theme and copy assets --
  const theme = await loadTheme(themesDir, siteConfig.theme);
  await copyThemeAssets(theme, distDir);
  await copyPhotoSwipeAssets(distDir);

  // -- 13. Render all pages --
  const engine = createRenderingEngine(theme.templatesDir, siteConfig);

  // -- Build tag pages --
  const tagPages = buildTagPages(galleriesWithImages);

  // -- Build location pages --
  const locationPages = buildLocationPages(galleriesWithImages);

  const buildContext: BuildContext = {
    siteConfig,
    galleries: galleriesWithImages,
    posts,
    pages,
    crossReferences,
    tagPages,
    locationPages,
    homepageContent,
  };

  await renderAll(engine, buildContext, distDir);

  // -- 14. Count output --
  const photoCount = galleriesWithImages.reduce((sum, g) => sum + g.photos.length, 0);
  // Pages: homepage + gallery index + galleries + photos + blog index + posts + pages + 404 + feed + sitemap
  const listedGalleries = galleriesWithImages.filter((g) => g.listed);
  const pageCount =
    1 + // homepage
    1 + // gallery index
    listedGalleries.length + // gallery pages
    photoCount + // photo permalinks
    1 + // blog index
    posts.length + // blog posts
    pages.length + // pages
    (tagPages.length > 0 ? 1 + tagPages.length : 0) + // tag index + tag pages
    (locationPages.length > 0 ? 1 + locationPages.length : 0) + // location index + location pages
    1 + // 404
    1 + // feed.xml
    1; // sitemap.xml

  const durationMs = Math.round(performance.now() - startTime);

  return {
    success: true,
    warnings,
    pageCount,
    photoCount,
    durationMs,
  };
}
