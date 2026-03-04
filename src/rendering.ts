import nunjucks from 'nunjucks';
import { resolve, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type {
  SiteConfig,
  Gallery,
  Photo,
  BlogPost,
  Page,
  TagPage,
  LocationPage,
  BuildContext,
  CrossReferenceGraph,
} from './types.js';
import { prefixedSrcset, sizes, bestVariant, responsiveImg } from './responsive.js';
import { slugifyTag, slugifyLocation } from './slugs.js';

// ---------------------------------------------------------------------------
// Nunjucks Environment
// ---------------------------------------------------------------------------

export interface RenderingEngine {
  readonly env: nunjucks.Environment;
  readonly siteConfig: SiteConfig;
}

/**
 * Create and configure the Nunjucks rendering environment.
 * Template search order: theme templates first, then fallback base templates.
 */
export function createRenderingEngine(
  themeTemplatesDir: string,
  siteConfig: SiteConfig,
): RenderingEngine {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(themeTemplatesDir, {
      noCache: true,
    }),
    {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
    },
  );

  // -- Global variables --
  env.addGlobal('site', siteConfig);
  env.addGlobal('current_year', new Date().getFullYear());

  // Build timestamp: "YYYYMMDD-HH:mm:ss"
  const now = new Date();
  const ts =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0') +
    ':' +
    String(now.getSeconds()).padStart(2, '0');
  env.addGlobal('build_timestamp', ts);

  // -- Filters --

  // Date formatting: {{ date | dateformat("YYYY-MM-DD") }}
  env.addFilter('dateformat', (date: unknown, fmt?: string) => {
    if (!(date instanceof Date)) return '';
    const format = fmt ?? 'YYYY-MM-DD';
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return format
      .replace('YYYY', y)
      .replace('MM', m)
      .replace('DD', d);
  });

  // Human-readable date: {{ date | datereadable }}  → "15 November 2024"
  env.addFilter('datereadable', (date: unknown) => {
    if (!(date instanceof Date)) return '';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${String(date.getDate())} ${months[date.getMonth()] ?? ''} ${String(date.getFullYear())}`;
  });

  // ISO date string for <time datetime="">
  env.addFilter('isodate', (date: unknown) => {
    if (!(date instanceof Date)) return '';
    return date.toISOString();
  });

  // Srcset from photo variants: {{ photo.variants | srcset }}
  env.addFilter('srcset', (variants: unknown) => {
    if (!Array.isArray(variants)) return '';
    return prefixedSrcset(variants as Photo['variants'], siteConfig.base_path);
  });

  // Sizes attribute: {{ photo | sizes }}
  env.addFilter('sizes', () => {
    return sizes();
  });

  // Best variant for a target width: {{ photo.variants | bestvariant(800) }}
  env.addFilter('bestvariant', (variants: unknown, width: number) => {
    if (!Array.isArray(variants)) return null;
    return bestVariant(variants as Photo['variants'], width) ?? null;
  });

  // Responsive <img> tag: {{ photo | responsiveimg("css-class") }}
  env.addFilter('responsiveimg', (photo: unknown, cssClass?: string) => {
    if (!photo || typeof photo !== 'object') return '';
    return new nunjucks.runtime.SafeString(
      responsiveImg(photo as Photo, siteConfig.base_path, cssClass),
    );
  });

  // Extract bare photo slug from namespaced slug: {{ photo.slug | bareslug }}
  env.addFilter('bareslug', (slug: unknown) => {
    if (typeof slug !== 'string') return '';
    return bareSlug(slug);
  });

  // Slugify a tag for URL: {{ tag | slugifytag }}
  env.addFilter('slugifytag', (tag: unknown) => {
    if (typeof tag !== 'string') return '';
    return slugifyTag(tag);
  });

  // Slugify a location for URL: {{ location | slugifylocation }}
  env.addFilter('slugifylocation', (location: unknown) => {
    if (typeof location !== 'string') return '';
    return slugifyLocation(location);
  });

  // URL builder: {{ "/photography/" | url }} → base-path-relative path
  env.addFilter('url', (path: unknown) => {
    if (typeof path !== 'string') return '';
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${siteConfig.base_path}${clean}`;
  });

  // Absolute URL (same as url, but explicit name for RSS/sitemap)
  env.addFilter('absurl', (path: unknown) => {
    if (typeof path !== 'string') return '';
    const base = siteConfig.base_url.replace(/\/+$/, '');
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${base}${clean}`;
  });

  // Truncate text to N characters with ellipsis
  env.addFilter('truncatewords', (str: unknown, count: number) => {
    if (typeof str !== 'string') return '';
    const words = str.split(/\s+/);
    if (words.length <= count) return str;
    return words.slice(0, count).join(' ') + '…';
  });

  // Mark string as safe (no auto-escaping)
  env.addFilter('safe_html', (str: unknown) => {
    if (typeof str !== 'string') return '';
    return new nunjucks.runtime.SafeString(str);
  });

  return { env, siteConfig };
}

// ---------------------------------------------------------------------------
// Page rendering helpers
// ---------------------------------------------------------------------------

/**
 * Render a template to a string.
 */
export function render(
  engine: RenderingEngine,
  template: string,
  context: Record<string, unknown>,
): string {
  return engine.env.render(template, context);
}

/**
 * Render a template and write the result to a file in distDir.
 * Creates parent directories as needed.
 */
export async function renderToFile(
  engine: RenderingEngine,
  template: string,
  context: Record<string, unknown>,
  distDir: string,
  outputPath: string,
): Promise<void> {
  const html = render(engine, template, context);
  const fullPath = resolve(distDir, outputPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, html, 'utf-8');
}

// ---------------------------------------------------------------------------
// Page renderers — each corresponds to a route
// ---------------------------------------------------------------------------

/** Render the homepage (/) */
export async function renderHomepage(
  engine: RenderingEngine,
  galleries: readonly Gallery[],
  homepageContent: string | undefined,
  distDir: string,
): Promise<void> {
  // Collect all photos from listed galleries, sort by date descending
  const allPhotos = galleries
    .filter((g) => g.listed)
    .flatMap((g) => g.photos.map((p) => ({ photo: p, gallery: g })))
    .sort((a, b) => {
      const dateA = a.photo.metadata.date ?? a.photo.exif.date ?? new Date(0);
      const dateB = b.photo.metadata.date ?? b.photo.exif.date ?? new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, engine.siteConfig.recent_shots_count);

  await renderToFile(
    engine,
    'homepage.html',
    { recent_photos: allPhotos, homepage_content: homepageContent },
    distDir,
    'index.html',
  );
}

/** Render the gallery index (/photography/) */
export async function renderGalleryIndex(
  engine: RenderingEngine,
  galleries: readonly Gallery[],
  distDir: string,
): Promise<void> {
  const listed = galleries.filter((g) => g.listed);
  await renderToFile(
    engine,
    'gallery-index.html',
    { galleries: listed },
    distDir,
    'photography/index.html',
  );
}

/** Render a single gallery page (/photography/<slug>/) */
export async function renderGalleryPage(
  engine: RenderingEngine,
  gallery: Gallery,
  distDir: string,
): Promise<void> {
  await renderToFile(
    engine,
    'gallery.html',
    { gallery },
    distDir,
    `photography/${gallery.slug}/index.html`,
  );
}

/** Render a photo permalink (/photography/<gallery>/<photo>/) */
export async function renderPhotoPage(
  engine: RenderingEngine,
  photo: Photo,
  gallery: Gallery,
  backLinks: readonly BlogPost[],
  distDir: string,
): Promise<void> {
  await renderToFile(
    engine,
    'photo.html',
    { photo, gallery, back_links: backLinks },
    distDir,
    `photography/${gallery.slug}/${bareSlug(photo.slug)}/index.html`,
  );
}

/** Render the blog index (/blog/) */
export async function renderBlogIndex(
  engine: RenderingEngine,
  posts: readonly BlogPost[],
  distDir: string,
): Promise<void> {
  await renderToFile(engine, 'blog-index.html', { posts }, distDir, 'blog/index.html');
}

/** Render a single blog post (/blog/<slug>/) */
export async function renderBlogPost(
  engine: RenderingEngine,
  post: BlogPost,
  galleries: readonly Gallery[],
  distDir: string,
): Promise<void> {
  // Replace shortcodes in rendered content with photo cards
  const photoIndex = buildPhotoIndex(galleries);
  const content = replaceShortcodes(post.renderedContent, photoIndex, engine.siteConfig.base_path);
  const postWithCards = { ...post, renderedContent: content };
  await renderToFile(engine, 'blog-post.html', { post: postWithCards }, distDir, `blog/${post.slug}/index.html`);
}

/** Render a simple page (/<slug>/) */
export async function renderPage(
  engine: RenderingEngine,
  page: Page,
  distDir: string,
): Promise<void> {
  await renderToFile(engine, 'page.html', { page }, distDir, `${page.slug}/index.html`);
}

/** Render the tag index (/tags/) */
export async function renderTagIndex(
  engine: RenderingEngine,
  tagPages: readonly TagPage[],
  distDir: string,
): Promise<void> {
  await renderToFile(engine, 'tag-index.html', { tag_pages: tagPages }, distDir, 'tags/index.html');
}

/** Render a single tag page (/tags/<slug>/) */
export async function renderTagPage(
  engine: RenderingEngine,
  tagPage: TagPage,
  distDir: string,
): Promise<void> {
  await renderToFile(
    engine,
    'tag.html',
    { tag_page: tagPage },
    distDir,
    `tags/${tagPage.slug}/index.html`,
  );
}

/** Render the location index (/locations/) */
export async function renderLocationIndex(
  engine: RenderingEngine,
  locationPages: readonly LocationPage[],
  distDir: string,
): Promise<void> {
  await renderToFile(engine, 'location-index.html', { location_pages: locationPages }, distDir, 'locations/index.html');
}

/** Render a single location page (/locations/<slug>/) */
export async function renderLocationPage(
  engine: RenderingEngine,
  locationPage: LocationPage,
  distDir: string,
): Promise<void> {
  await renderToFile(
    engine,
    'location.html',
    { location_page: locationPage },
    distDir,
    `locations/${locationPage.slug}/index.html`,
  );
}

/** Render the 404 page */
export async function render404(
  engine: RenderingEngine,
  distDir: string,
): Promise<void> {
  await renderToFile(engine, '404.html', {}, distDir, '404.html');
}

/** Render the RSS feed (/feed.xml) */
export async function renderRssFeed(
  engine: RenderingEngine,
  posts: readonly BlogPost[],
  distDir: string,
): Promise<void> {
  await renderToFile(engine, 'feed.xml', { posts }, distDir, 'feed.xml');
}

/** Render the sitemap (/sitemap.xml) */
export async function renderSitemap(
  engine: RenderingEngine,
  context: BuildContext,
  distDir: string,
): Promise<void> {
  const { galleries, posts, pages, tagPages, locationPages } = context;
  await renderToFile(
    engine,
    'sitemap.xml',
    { galleries, posts, pages, tag_pages: tagPages, location_pages: locationPages },
    distDir,
    'sitemap.xml',
  );
}

// ---------------------------------------------------------------------------
// Full-site renderer
// ---------------------------------------------------------------------------

/**
 * Render all pages for the site.
 */
export async function renderAll(
  engine: RenderingEngine,
  context: BuildContext,
  distDir: string,
): Promise<void> {
  const { galleries, posts, pages, crossReferences, tagPages, locationPages, homepageContent } = context;

  // Homepage
  await renderHomepage(engine, galleries, homepageContent, distDir);

  // Gallery index
  await renderGalleryIndex(engine, galleries, distDir);

  // Individual galleries and photos
  for (const gallery of galleries) {
    if (gallery.listed) {
      await renderGalleryPage(engine, gallery, distDir);
    }

    for (const photo of gallery.photos) {
      const postSlugs = getBackLinkSlugs(crossReferences, photo.slug);
      const backLinks = posts.filter((p) => postSlugs.includes(p.slug));
      await renderPhotoPage(engine, photo, gallery, backLinks, distDir);
    }
  }

  // Blog
  await renderBlogIndex(engine, posts, distDir);
  for (const post of posts) {
    await renderBlogPost(engine, post, galleries, distDir);
  }

  // Pages
  for (const page of pages) {
    await renderPage(engine, page, distDir);
  }

  // Tags
  if (tagPages.length > 0) {
    await renderTagIndex(engine, tagPages, distDir);
    for (const tagPage of tagPages) {
      await renderTagPage(engine, tagPage, distDir);
    }
  }

  // Locations
  if (locationPages.length > 0) {
    await renderLocationIndex(engine, locationPages, distDir);
    for (const locationPage of locationPages) {
      await renderLocationPage(engine, locationPage, distDir);
    }
  }

  // 404
  await render404(engine, distDir);

  // RSS feed
  await renderRssFeed(engine, posts, distDir);

  // Sitemap
  await renderSitemap(engine, context, distDir);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBackLinkSlugs(
  crossReferences: CrossReferenceGraph,
  photoSlug: string,
): readonly string[] {
  return crossReferences.photoToPostSlugs.get(photoSlug) ?? [];
}

/**
 * Extract the bare photo slug from a namespaced slug (gallery/photo → photo).
 */
function bareSlug(namespacedSlug: string): string {
  const parts = namespacedSlug.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : namespacedSlug;
}

/**
 * Build a lookup map from photo slug (both namespaced and bare) to photo + gallery.
 */
function buildPhotoIndex(
  galleries: readonly Gallery[],
): Map<string, { photo: Photo; gallery: Gallery }> {
  const index = new Map<string, { photo: Photo; gallery: Gallery }>();
  for (const gallery of galleries) {
    for (const photo of gallery.photos) {
      index.set(photo.slug, { photo, gallery });
      // Also index by bare slug for shortcode matching
      const bare = bareSlug(photo.slug);
      if (!index.has(bare)) {
        index.set(bare, { photo, gallery });
      }
    }
  }
  return index;
}

/**
 * Replace {{< photo "slug" >}} shortcodes in rendered HTML with photo cards.
 */
function replaceShortcodes(
  html: string,
  photoIndex: Map<string, { photo: Photo; gallery: Gallery }>,
  basePath: string,
): string {
  // Split on <pre>/<code> blocks to avoid replacing shortcodes inside them
  const parts = html.split(/(<pre[\s>][\s\S]*?<\/pre>|<code[\s>][\s\S]*?<\/code>)/g);
  const shortcodeRe = /(?:<p>)?\{\{(?:&lt;|&#x3C;)\s*photo\s+(?:&quot;|&#x22;|")([^"&]+)(?:&quot;|&#x22;|")\s*(?:&gt;|&#x3E;|>)\}\}(?:<\/p>)?/g;

  const result = parts.map((part, i) => {
    // Odd-indexed parts are <pre>/<code> blocks — leave them alone
    if (i % 2 === 1) return part;
    return part.replace(shortcodeRe, (_match, slug: string) => {
      const entry = photoIndex.get(slug);
      if (!entry) return `<!-- photo not found: ${slug} -->`;
      return renderPhotoCard(entry.photo, entry.gallery, basePath);
    });
  });

  return result.join('');
}

/**
 * Render a photo card for use inside blog post content.
 */
function renderPhotoCard(photo: Photo, gallery: Gallery, basePath: string): string {
  const best = bestVariant(photo.variants, 800);
  if (!best) return '';

  const alt = escapeAttr(photo.metadata.title || bareSlug(photo.slug));
  const href = `${basePath}/photography/${gallery.slug}/${bareSlug(photo.slug)}/`;
  const title = photo.metadata.title;
  const meta: string[] = [];
  if (photo.metadata.location) meta.push(escapeAttr(photo.metadata.location));
  if (photo.metadata.camera) meta.push(escapeAttr(photo.metadata.camera));

  return [
    '<div class="photo-card">',
    `  <a href="${href}">`,
    '    <div class="photo-card__image">',
    `      <img src="${basePath}${best.path}" srcset="${prefixedSrcset(photo.variants, basePath)}" sizes="(max-width: 42rem) 100vw, 42rem" alt="${alt}" loading="lazy" decoding="async">`,
    '    </div>',
    '    <div class="photo-card__info">',
    title ? `      <span class="photo-card__title">${escapeAttr(title)}</span>` : '',
    meta.length ? `      <span class="photo-card__meta">${meta.join(' · ')}</span>` : '',
    '    </div>',
    '  </a>',
    '</div>',
  ].filter(Boolean).join('\n');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
