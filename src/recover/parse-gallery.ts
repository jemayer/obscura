import * as cheerio from 'cheerio';
import type { GalleryEntry, GalleryLayout } from '../types.js';
import type { ParsedGallery, ParseResult, RecoveryWarning } from './types.js';

function deriveSlug(pageUrl: string): string {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/photography\/([^/]+)\/$/u.exec(path);
  if (!m || m[1] === undefined) {
    throw new Error(`gallery URL does not match /photography/<g>/: ${pageUrl}`);
  }
  return m[1];
}

function detectLayout($: cheerio.CheerioAPI): GalleryLayout | undefined {
  const container = $('.gallery').first();
  if (container.hasClass('gallery--grid')) return 'grid';
  if (container.hasClass('gallery--masonry')) return 'masonry';
  return undefined;
}

export function parseGalleryPage(
  html: string,
  pageUrl: string,
  listedSlugs: ReadonlySet<string>,
): ParseResult<ParsedGallery> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const slug = deriveSlug(pageUrl);

  const title = $('h1').first().text().trim();
  if (title.length === 0) {
    warnings.push({
      category: 'gallery',
      subject: slug,
      message: 'no <h1> found on gallery page; using slug as title',
    });
  }

  const description = $('.gallery-intro').first().text().trim();
  const layout = detectLayout($);

  const entry: GalleryEntry = {
    slug,
    title: title.length > 0 ? title : slug,
    listed: listedSlugs.has(slug),
    ...(description.length > 0 && { description }),
    ...(layout !== undefined && { layout }),
  };

  return { value: { entry }, warnings };
}

/**
 * Parse /photography/ to discover which gallery slugs are listed.
 * Any gallery whose detail page exists but isn't linked from here is `listed: false`.
 */
export function parseGalleryIndex(html: string, baseUrl: string): Set<string> {
  const $ = cheerio.load(html);
  const base = baseUrl.replace(/\/+$/u, '');
  const slugs = new Set<string>();
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const abs = href.startsWith('http') ? href : `${base}${href}`;
    const path = ((): string => {
      try {
        return new URL(abs).pathname;
      } catch {
        return '';
      }
    })();
    const m = /^.*\/photography\/([^/]+)\/$/u.exec(path);
    if (m && m[1] !== undefined) slugs.add(m[1]);
  });
  return slugs;
}
