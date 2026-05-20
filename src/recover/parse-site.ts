import * as cheerio from 'cheerio';
import type { NavItem, SocialPlatform } from '../types.js';
import type {
  ParseResult,
  RecoveredSiteConfig,
  RecoveryWarning,
} from './types.js';

/** Path → keyword mapping for Obscura's built-in nav routes (mirrors src/navigation.ts). */
const BUILTIN_PATH_TO_KEYWORD: ReadonlyMap<string, string> = new Map([
  ['/photography/', 'photography'],
  ['/tags/', 'tags'],
  ['/locations/', 'locations'],
  ['/blog/', 'blog'],
]);

/** Default 6-item menu Obscura ships with when navigation is omitted. */
const DEFAULT_NAV: readonly NavItem[] = [
  { label: 'Photography', url: 'photography' },
  { label: 'Tags', url: 'tags' },
  { label: 'Locations', url: 'locations' },
  { label: 'Blog', url: 'blog' },
  { label: 'About', url: '/about/' },
  { label: 'Contact', url: '/contact/' },
];

function navMatchesDefault(items: readonly NavItem[]): boolean {
  if (items.length !== DEFAULT_NAV.length) return false;
  return items.every((item, i) => {
    const ref = DEFAULT_NAV[i];
    return ref !== undefined && item.label === ref.label && item.url === ref.url;
  });
}

function parseNavigation(
  $: cheerio.CheerioAPI,
  basePath: string,
): readonly NavItem[] | undefined {
  const links = $('nav.site-nav > a[href]');
  if (links.length === 0) return undefined;
  const items: NavItem[] = [];
  links.each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const label = $(el).text().trim();
    if (label.length === 0) return;
    const url = navUrlFromHref(href, basePath);
    if (url === null) return;
    items.push({ label, url });
  });
  if (items.length === 0) return undefined;
  if (navMatchesDefault(items)) return undefined;
  return items;
}

function navUrlFromHref(href: string, basePath: string): string | null {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  if (!href.startsWith('/')) return null;
  const path = basePath && href.startsWith(basePath) ? href.slice(basePath.length) : href;
  const keyword = BUILTIN_PATH_TO_KEYWORD.get(path);
  if (keyword) return keyword;
  return path;
}

const SOCIAL_HOST_PATTERNS: ReadonlyArray<{
  readonly host: RegExp;
  readonly platform: SocialPlatform;
}> = [
  { host: /(^|\.)bsky\.app$/u, platform: 'bluesky' },
  { host: /(^|\.)flickr\.com$/u, platform: 'flickr' },
  { host: /(^|\.)github\.com$/u, platform: 'github' },
  { host: /(^|\.)instagram\.com$/u, platform: 'instagram' },
  { host: /(^|\.)500px\.com$/u, platform: '500px' },
  { host: /(^|\.)pixelfed\.social$/u, platform: 'pixelfed' },
  { host: /(^|\.)mastodon\.social$/u, platform: 'mastodon' },
];

function detectSocialPlatform(url: string): SocialPlatform | null {
  try {
    const u = new URL(url);
    for (const { host, platform } of SOCIAL_HOST_PATTERNS) {
      if (host.test(u.hostname)) return platform;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function detectHeroImage($: cheerio.CheerioAPI): string | undefined {
  const heroImg = $('img.hero__image').first();
  if (heroImg.length === 0) return undefined;
  const candidatePaths: string[] = [];
  const src = heroImg.attr('src');
  if (src) candidatePaths.push(src);
  const srcset = heroImg.attr('srcset');
  if (srcset) {
    for (const part of srcset.split(',')) {
      const m = /^(\S+)\s+\d+w$/u.exec(part.trim());
      if (m && m[1] !== undefined) candidatePaths.push(m[1]);
    }
  }
  for (const candidate of candidatePaths) {
    const path = ((): string => {
      try {
        return new URL(candidate, 'http://placeholder').pathname;
      } catch {
        return candidate;
      }
    })();
    const m = /\/assets\/images\/([^/]+)\/([^/]+?)(?:-\d+w|-thumb)?\.[a-zA-Z0-9]+$/u.exec(
      path,
    );
    if (m && m[1] !== undefined && m[2] !== undefined) {
      return `${m[1]}/${m[2]}`;
    }
  }
  return undefined;
}

function collectBreakpoints($: cheerio.CheerioAPI): number[] {
  const widths = new Set<number>();
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset') ?? '';
    for (const part of srcset.split(',')) {
      const m = /\s(\d+)w$/u.exec(part.trim());
      if (m && m[1] !== undefined) widths.add(Number(m[1]));
    }
  });
  return [...widths].sort((a, b) => a - b);
}

export function parseHomepage(
  html: string,
  theme: string,
): ParseResult<RecoveredSiteConfig> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];

  const headerTitle = $('header .site-title').first().text().trim();
  const titleTag = $('title').first().text().trim();
  const title =
    headerTitle.length > 0
      ? headerTitle
      : (titleTag.split(' - ')[0] ?? '').trim();

  const subtitle =
    $('header .site-subtitle').first().text().trim() || undefined;
  const description =
    $('meta[name="description"]').attr('content')?.trim() || undefined;

  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() ?? '';
  if (ogUrl.length === 0) {
    throw new Error(
      'homepage is missing <meta property="og:url">; cannot derive base_url',
    );
  }
  const baseUrl = ((): string => {
    try {
      const u = new URL(ogUrl);
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/u, '')}`;
    } catch {
      throw new Error(`homepage og:url is not a valid URL: ${ogUrl}`);
    }
  })();

  const credit = $('footer .site-credit').first().text().trim();
  const photographerMatch =
    /^(?:Photography|Photos?|Images?)\s+by\s+(.+)$/iu.exec(credit);
  const defaultPhotographer =
    photographerMatch && photographerMatch[1] !== undefined
      ? photographerMatch[1].trim()
      : undefined;

  const socialLinks: {
    readonly platform: SocialPlatform;
    readonly url: string;
  }[] = [];
  $('footer .social-links a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const platform = detectSocialPlatform(href);
    if (platform) socialLinks.push({ platform, url: href });
  });

  const breakpoints = collectBreakpoints($);
  const heroImage = detectHeroImage($);
  const baseUrlPath = ((): string => {
    try {
      return new URL(baseUrl).pathname.replace(/\/+$/u, '');
    } catch {
      return '';
    }
  })();
  const navigation = parseNavigation($, baseUrlPath);

  return {
    value: {
      theme,
      title: title.length > 0 ? title : 'Untitled',
      base_url: baseUrl,
      ...(subtitle !== undefined && { subtitle }),
      ...(description !== undefined && { description }),
      ...(defaultPhotographer !== undefined && {
        default_photographer: defaultPhotographer,
      }),
      ...(heroImage !== undefined && { hero_image: heroImage }),
      ...(navigation !== undefined && { navigation }),
      social_links: socialLinks,
      ...(breakpoints.length > 0 && {
        images: { breakpoints, webp_quality: 85 },
      }),
    },
    warnings,
  };
}
