import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import type { PhotoMetadata } from '../types.js';
import type { ParsedPhoto, ParseResult, RecoveryWarning } from './types.js';

const LICENSE_URL_TO_ID: ReadonlyMap<string, string> = new Map([
  ['https://creativecommons.org/licenses/by/4.0/', 'CC-BY-4.0'],
  ['https://creativecommons.org/licenses/by-sa/4.0/', 'CC-BY-SA-4.0'],
  ['https://creativecommons.org/licenses/by-nc/4.0/', 'CC-BY-NC-4.0'],
  ['https://creativecommons.org/licenses/by-nc-sa/4.0/', 'CC-BY-NC-SA-4.0'],
  ['https://creativecommons.org/licenses/by-nd/4.0/', 'CC-BY-ND-4.0'],
  ['https://creativecommons.org/licenses/by-nc-nd/4.0/', 'CC-BY-NC-ND-4.0'],
  ['https://creativecommons.org/publicdomain/zero/1.0/', 'CC0-1.0'],
]);

interface LargestVariant {
  readonly url: string;
  readonly width: number;
}

function pickLargestVariant(
  src: string,
  srcset: string,
  baseUrl: string,
): LargestVariant | null {
  if (srcset.trim().length > 0) {
    let best: LargestVariant | null = null;
    for (const part of srcset.split(',')) {
      const trimmed = part.trim();
      const match = /^(\S+)\s+(\d+)w$/u.exec(trimmed);
      if (!match) continue;
      const width = Number(match[2]);
      const absUrl = new URL(match[1], baseUrl).toString();
      if (!best || width > best.width) {
        best = { url: absUrl, width };
      }
    }
    if (best) return best;
  }
  if (src.trim().length > 0) {
    return { url: new URL(src, baseUrl).toString(), width: 0 };
  }
  return null;
}

function extractMeta(
  $: cheerio.CheerioAPI,
  label: string,
): cheerio.Cheerio<Element> | null {
  const labels = $('.photo-meta__label');
  const match = labels.filter((_, el) => $(el).text().trim() === label).first();
  if (match.length === 0) return null;
  return match.parent().find('.photo-meta__value').first();
}

function parseSettings(value: string): Partial<PhotoMetadata> {
  const result: Partial<PhotoMetadata> = {};
  const focal = /\b(\d+)mm\b/u.exec(value);
  if (focal) (result as { focal_length?: number }).focal_length = Number(focal[1]);
  const ap = /\bf\/([\d.]+)\b/u.exec(value);
  if (ap) (result as { aperture?: number }).aperture = Number(ap[1]);
  const iso = /\bISO\s+(\d+)\b/u.exec(value);
  if (iso) (result as { iso?: number }).iso = Number(iso[1]);
  const shutter = /\b(\d+\/\d+|\d+(?:\.\d+)?)s\b/u.exec(value);
  if (shutter) (result as { shutter_speed?: string }).shutter_speed = shutter[1];
  return result;
}

function parseLicense(valueEl: cheerio.Cheerio<Element>): string | undefined {
  const link = valueEl.find('a').first();
  if (link.length > 0) {
    const href = link.attr('href') ?? '';
    const mapped = LICENSE_URL_TO_ID.get(href);
    if (mapped) return mapped;
  }
  const text = valueEl.text().trim();
  return text.length > 0 ? text : undefined;
}

function deriveSlugs(pageUrl: string): {
  gallerySlug: string;
  photoSlug: string;
} {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/photography\/([^/]+)\/([^/]+)\/$/u.exec(path);
  if (!m) {
    throw new Error(
      `photo page URL does not match /photography/<g>/<p>/: ${pageUrl}`,
    );
  }
  return { gallerySlug: m[1], photoSlug: m[2] };
}

export function parsePhotoPage(
  html: string,
  pageUrl: string,
): ParseResult<ParsedPhoto> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const { gallerySlug, photoSlug } = deriveSlugs(pageUrl);
  const metadata: Partial<PhotoMetadata> = {};
  const mut = metadata as {
    title?: string;
    caption?: string;
    date?: Date;
    camera?: string;
    lens?: string;
    location?: string;
    photographer?: string;
    license?: string;
    tags?: readonly string[];
  };

  const title = $('.photo-detail__title').first().text().trim();
  if (title.length > 0) mut.title = title;

  const caption = $('.photo-detail__caption').first().text().trim();
  if (caption.length > 0) mut.caption = caption;

  const dateEl = extractMeta($, 'Date');
  if (dateEl) {
    const iso = dateEl.find('time').attr('datetime');
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) mut.date = d;
    }
  }

  const camera = extractMeta($, 'Camera')?.text().trim();
  if (camera && camera.length > 0) mut.camera = camera;

  const lens = extractMeta($, 'Lens')?.text().trim();
  if (lens && lens.length > 0) mut.lens = lens;

  const settingsText = extractMeta($, 'Settings')?.text().trim() ?? '';
  Object.assign(metadata, parseSettings(settingsText));

  const location = extractMeta($, 'Location')?.find('a').first().text().trim();
  if (location && location.length > 0) mut.location = location;

  const photographer = extractMeta($, 'Photographer')?.text().trim();
  if (photographer && photographer.length > 0) mut.photographer = photographer;

  const licenseEl = extractMeta($, 'License');
  if (licenseEl) {
    const license = parseLicense(licenseEl);
    if (license) mut.license = license;
  }

  const tags: string[] = [];
  const tagsEl = extractMeta($, 'Tags');
  if (tagsEl) {
    tagsEl.find('a.tag').each((_, el) => {
      tags.push($(el).text().trim());
    });
  }
  if (tags.length > 0) mut.tags = tags;

  const img = $('.photo-detail__image img').first();
  const variant = pickLargestVariant(
    img.attr('src') ?? '',
    img.attr('srcset') ?? '',
    pageUrl,
  );
  let imageUrl: string | null = null;
  let imageExt: string | null = null;
  if (variant) {
    imageUrl = variant.url;
    const extMatch = /\.([a-zA-Z0-9]+)(?:\?|$)/u.exec(
      new URL(variant.url).pathname,
    );
    if (extMatch) imageExt = `.${extMatch[1].toLowerCase()}`;
  } else {
    warnings.push({
      category: 'image',
      subject: `${gallerySlug}/${photoSlug}`,
      message:
        'no <img src> or srcset found; sidecar will be written without an image',
    });
  }

  return {
    value: { gallerySlug, photoSlug, metadata, imageUrl, imageExt },
    warnings,
  };
}
