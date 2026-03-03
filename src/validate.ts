import { resolve } from 'node:path';
import { loadSiteConfig, loadGalleryConfig } from './config.js';
import { validateAllGalleryFormats } from './image-validation.js';
import { loadGalleries } from './gallery.js';
import { loadAllBlogPosts, loadAllPages } from './markdown.js';
import { formatExifWarnings } from './exif.js';
import { loadTheme } from './theme.js';

/**
 * Content validation — fast check without image processing.
 * Validates: config, image formats, EXIF/sidecars, slug uniqueness,
 * shortcode references, theme existence.
 */
async function main(): Promise<void> {
  const projectDir = resolve(process.cwd());
  const warnings: string[] = [];
  let hasErrors = false;

  console.log('Obscura — validating content…\n');

  // -- 1. Config --
  let siteConfig;
  let galleryConfig;

  try {
    siteConfig = await loadSiteConfig(projectDir);
    console.log('  ✓ site.yaml');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ✗ site.yaml: ${msg}`);
    hasErrors = true;
  }

  try {
    galleryConfig = await loadGalleryConfig(projectDir);
    console.log('  ✓ galleries.yaml');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ✗ galleries.yaml: ${msg}`);
    hasErrors = true;
  }

  if (!siteConfig || !galleryConfig) {
    console.error('\n✗ Validation failed — config errors must be fixed first.');
    process.exitCode = 1;
    return;
  }

  // -- 2. Theme --
  const themesDir = resolve(projectDir, 'themes');
  try {
    await loadTheme(themesDir, siteConfig.theme);
    console.log(`  ✓ theme "${siteConfig.theme}"`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ✗ theme: ${msg}`);
    hasErrors = true;
  }

  // -- 3. Image format validation --
  const photosDir = resolve(projectDir, 'content', 'photos');
  const gallerySlugs = galleryConfig.galleries.map((g) => g.slug);

  try {
    await validateAllGalleryFormats(photosDir, gallerySlugs);
    console.log('  ✓ image formats');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ✗ image formats: ${msg}`);
    hasErrors = true;
  }

  // -- 4. Galleries (EXIF + sidecars + slug uniqueness) --
  try {
    const { slugIndex, warnings: galleryWarnings } = await loadGalleries(
      photosDir,
      galleryConfig.galleries,
    );
    console.log(`  ✓ galleries (${String(gallerySlugs.length)} configured, ${String(slugIndex.size)} photos indexed)`);
    if (galleryWarnings.length > 0) {
      warnings.push(formatExifWarnings(galleryWarnings));
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ✗ galleries: ${msg}`);
    hasErrors = true;
  }

  // -- 5. Blog posts (shortcode resolution) --
  const postsDir = resolve(projectDir, 'content', 'posts');
  try {
    // We need slugIndex for shortcode validation — re-load if galleries succeeded
    const { slugIndex } = await loadGalleries(photosDir, galleryConfig.galleries);
    const posts = await loadAllBlogPosts(postsDir, slugIndex, '');
    console.log(`  ✓ blog posts (${String(posts.length)})`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ✗ blog posts: ${msg}`);
    hasErrors = true;
  }

  // -- 6. Pages --
  const pagesDir = resolve(projectDir, 'content', 'pages');
  try {
    const pages = await loadAllPages(pagesDir, '');
    console.log(`  ✓ pages (${String(pages.length)})`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ✗ pages: ${msg}`);
    hasErrors = true;
  }

  // -- Summary --
  if (warnings.length > 0) {
    console.warn('\n⚠ Warnings:\n');
    for (const w of warnings) {
      console.warn(w);
    }
  }

  if (hasErrors) {
    console.error('\n✗ Validation failed.');
    process.exitCode = 1;
  } else {
    console.log('\n✓ All content valid.');
  }
}

void main();
