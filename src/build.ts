import { resolve } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { loadSiteConfig, loadGalleryConfig } from './config.js';
import { generateAllSidecars } from './sidecar.js';
import { validateAllGalleryFormats } from './image-validation.js';
import { loadGalleries } from './gallery.js';
import { loadAllBlogPosts, loadAllPages } from './markdown.js';
import { buildCrossReferenceGraph } from './crossref.js';
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

export async function build(projectDir: string): Promise<BuildResult> {
  const startTime = performance.now();
  const warnings: string[] = [];

  // -- 1. Load configuration --
  const configDir = resolve(projectDir, 'config');
  const siteConfig = await loadSiteConfig(resolve(configDir, 'site.yaml'));
  const galleryConfig = await loadGalleryConfig(resolve(configDir, 'galleries.yaml'));

  // -- 2. Resolve directories --
  const photosDir = resolve(projectDir, 'content', 'photos');
  const postsDir = resolve(projectDir, 'content', 'posts');
  const pagesDir = resolve(projectDir, 'content', 'pages');
  const themesDir = resolve(projectDir, 'themes');
  const distDir = resolve(projectDir, 'dist');

  // -- 3. Clean and prepare dist --
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

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

  // -- 8. Load pages --
  const pages = await loadAllPages(pagesDir);

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

  const buildContext: BuildContext = {
    siteConfig,
    galleries: galleriesWithImages,
    posts,
    pages,
    crossReferences,
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
