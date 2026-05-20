import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { fetchText } from './recover/fetch.js';
import { identifyFromHtml } from './recover/identify.js';
import {
  categoriseSitemap,
  gallerySlugsFromPhotoUrls,
} from './recover/sitemap.js';
import { parseHomepage } from './recover/parse-site.js';
import {
  parseGalleryPage,
  parseGalleryIndex,
  parseGalleryContent,
} from './recover/parse-gallery.js';
import { parsePhotoPage } from './recover/parse-photo.js';
import { parseBlogPost } from './recover/parse-post.js';
import { parsePage, parseHomepageIntro } from './recover/parse-page.js';
import { downloadImage } from './recover/download-image.js';
import {
  writeSiteConfig,
  writeGalleriesConfig,
  writeGalleryIndexContent,
  writeSidecar,
  writePost,
  writePage,
} from './recover/write.js';
import { formatReport } from './recover/report.js';
import type { RecoveryWarning } from './recover/types.js';
import type { GalleryEntry } from './types.js';

interface CliArgs {
  readonly url: string;
  readonly targetDir: string;
  readonly force: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const positional: string[] = [];
  let force = false;
  for (const arg of argv) {
    if (arg === '--force') force = true;
    else positional.push(arg);
  }
  const [url, targetDirArg] = positional;
  if (url === undefined) {
    throw new Error('usage: npm run recover -- <url> [target-dir] [--force]');
  }
  const targetDir = resolve(targetDirArg ?? process.cwd());
  return { url, targetDir, force };
}

async function targetIsEmpty(targetDir: string): Promise<boolean> {
  const sitePath = resolve(targetDir, 'site');
  if (!existsSync(sitePath)) return true;
  const entries = await readdir(sitePath);
  return entries.length === 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Obscura — recovering ${args.url}`);
  console.log(`Target:   ${args.targetDir}`);

  if (!args.force && !(await targetIsEmpty(args.targetDir))) {
    console.error(
      'Error: site/ already exists and is non-empty in the target directory.',
    );
    console.error('Pass --force to overwrite.');
    process.exit(1);
  }

  const allWarnings: RecoveryWarning[] = [];

  const landingHtml = await fetchText(args.url);
  const identity = identifyFromHtml(landingHtml);
  allWarnings.push(...identity.warnings);
  console.log(
    `  Identified Obscura ${identity.version ?? '(unknown)'} / theme=${identity.theme}`,
  );

  const homepageParse = parseHomepage(landingHtml, identity.theme);
  allWarnings.push(...homepageParse.warnings);
  const siteConfig = homepageParse.value;
  const baseUrl = siteConfig.base_url;

  // Homepage intro content (site/content/pages/index.md), if present
  const homepageIntro = parseHomepageIntro(landingHtml);
  if (homepageIntro) {
    allWarnings.push(...homepageIntro.warnings);
    await writePage(args.targetDir, homepageIntro.value);
  }

  const sitemapXml = await fetchText(`${baseUrl}/sitemap.xml`);
  const urls = categoriseSitemap(sitemapXml, baseUrl);
  console.log(
    `  Sitemap: ${String(urls.galleries.length)} galleries, ${String(urls.photos.length)} photos, ${String(urls.posts.length)} posts, ${String(urls.pages.length)} pages`,
  );

  const listedSlugs = urls.galleryIndex
    ? parseGalleryIndex(await fetchText(urls.galleryIndex), baseUrl)
    : new Set<string>();

  const galleries: GalleryEntry[] = [];
  const parsedSlugs = new Set<string>();
  for (const url of urls.galleries) {
    try {
      const html = await fetchText(url);
      const parsed = parseGalleryPage(html, url, listedSlugs);
      allWarnings.push(...parsed.warnings);
      galleries.push(parsed.value.entry);
      parsedSlugs.add(parsed.value.entry.slug);

      // Gallery-level index.md content (if present)
      const content = parseGalleryContent(html);
      if (content && content.markdownBody.length > 0) {
        await writeGalleryIndexContent(
          args.targetDir,
          parsed.value.entry.slug,
          content.markdownBody,
        );
      }
    } catch (e) {
      allWarnings.push({
        category: 'gallery',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // Discover unlisted galleries: Obscura's sitemap emits no index URL for
  // listed:false galleries, only their photo URLs. Synthesize entries so the
  // build pipeline loads their photos into the slug index.
  const allGallerySlugs = gallerySlugsFromPhotoUrls(urls.photos, baseUrl);
  for (const slug of allGallerySlugs) {
    if (parsedSlugs.has(slug)) continue;
    galleries.push({ slug, title: slug, listed: false });
    allWarnings.push({
      category: 'gallery',
      subject: slug,
      message:
        'unlisted gallery (no index page in sitemap); title derived from slug, no description/layout available',
    });
  }

  let photoCount = 0;
  for (const url of urls.photos) {
    try {
      const html = await fetchText(url);
      const parsed = parsePhotoPage(html, url);
      allWarnings.push(...parsed.warnings);
      const { gallerySlug, photoSlug, metadata, imageUrl, imageExt } =
        parsed.value;
      await writeSidecar(args.targetDir, gallerySlug, photoSlug, metadata);
      if (imageUrl && imageExt) {
        const dest = resolve(
          args.targetDir,
          'site',
          'content',
          'photos',
          gallerySlug,
          `${photoSlug}${imageExt}`,
        );
        try {
          await downloadImage(imageUrl, dest);
        } catch (e) {
          allWarnings.push({
            category: 'image',
            subject: `${gallerySlug}/${photoSlug}`,
            message: `download failed: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
      photoCount++;
    } catch (e) {
      allWarnings.push({
        category: 'photo',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  let postCount = 0;
  for (const url of urls.posts) {
    try {
      const html = await fetchText(url);
      const parsed = parseBlogPost(html, url);
      allWarnings.push(...parsed.warnings);
      await writePost(args.targetDir, parsed.value);
      postCount++;
    } catch (e) {
      allWarnings.push({
        category: 'post',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  let pageCount = 0;
  for (const url of urls.pages) {
    try {
      const html = await fetchText(url);
      const parsed = parsePage(html, url);
      allWarnings.push(...parsed.warnings);
      await writePage(args.targetDir, parsed.value);
      pageCount++;
    } catch (e) {
      allWarnings.push({
        category: 'page',
        subject: url,
        message: `failed to fetch/parse: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  await writeSiteConfig(args.targetDir, siteConfig);
  await writeGalleriesConfig(args.targetDir, galleries);

  const report = formatReport({
    sourceUrl: args.url,
    identifiedTheme: identity.theme,
    identifiedVersion: identity.version,
    buildTimestamp: identity.buildTimestamp,
    counts: {
      galleries: galleries.length,
      photos: photoCount,
      posts: postCount,
      pages: pageCount,
    },
    warnings: allWarnings,
  });
  await mkdir(args.targetDir, { recursive: true });
  await writeFile(
    resolve(args.targetDir, 'recovery-report.md'),
    report,
    'utf-8',
  );

  console.log(
    `\n✓ Recovered ${String(galleries.length)} galleries, ${String(photoCount)} photos, ${String(postCount)} posts, ${String(pageCount)} pages`,
  );
  console.log(`  Report: ${resolve(args.targetDir, 'recovery-report.md')}`);
  if (allWarnings.length > 0) {
    console.log(
      `  ${String(allWarnings.length)} warnings — see report for details.`,
    );
  }
}

void main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(`\n✗ Recovery failed: ${err.message}`);
  } else {
    console.error('\n✗ Recovery failed with an unknown error');
  }
  process.exitCode = 1;
});
