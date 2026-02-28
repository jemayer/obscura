import nunjucks from 'nunjucks';
import { resolve, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type {
  SiteConfig,
  Gallery,
  Photo,
  BlogPost,
  Page,
  BuildContext,
  CrossReferenceGraph,
} from './types.js';
import { srcset, sizes, bestVariant, responsiveImg } from './responsive.js';

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
    return srcset(variants as Photo['variants']);
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
      responsiveImg(photo as Photo, cssClass),
    );
  });

  // Extract bare photo slug from namespaced slug: {{ photo.slug | bareslug }}
  env.addFilter('bareslug', (slug: unknown) => {
    if (typeof slug !== 'string') return '';
    return bareSlug(slug);
  });

  // URL builder: {{ "/photography/" | url }} → root-relative path
  env.addFilter('url', (path: unknown) => {
    if (typeof path !== 'string') return '';
    return path.startsWith('/') ? path : `/${path}`;
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

  await renderToFile(engine, 'homepage.html', { recent_photos: allPhotos }, distDir, 'index.html');
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
  distDir: string,
): Promise<void> {
  await renderToFile(engine, 'blog-post.html', { post }, distDir, `blog/${post.slug}/index.html`);
}

/** Render a simple page (/<slug>/) */
export async function renderPage(
  engine: RenderingEngine,
  page: Page,
  distDir: string,
): Promise<void> {
  await renderToFile(engine, 'page.html', { page }, distDir, `${page.slug}/index.html`);
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
  const { galleries, posts, pages } = context;
  await renderToFile(
    engine,
    'sitemap.xml',
    { galleries, posts, pages },
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
  const { galleries, posts, pages, crossReferences } = context;

  // Homepage
  await renderHomepage(engine, galleries, distDir);

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
    await renderBlogPost(engine, post, distDir);
  }

  // Pages
  for (const page of pages) {
    await renderPage(engine, page, distDir);
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
