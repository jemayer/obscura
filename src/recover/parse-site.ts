import * as cheerio from 'cheerio';
import type { SocialPlatform } from '../types.js';
import type {
  ParseResult,
  RecoveredSiteConfig,
  RecoveryWarning,
} from './types.js';

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

function collectBreakpoints($: cheerio.CheerioAPI): number[] {
  const widths = new Set<number>();
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset') ?? '';
    for (const part of srcset.split(',')) {
      const m = /\s(\d+)w$/u.exec(part.trim());
      if (m) widths.add(Number(m[1]));
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
    headerTitle.length > 0 ? headerTitle : titleTag.split(' - ')[0].trim();

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
  const defaultPhotographer = photographerMatch
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
      social_links: socialLinks,
      ...(breakpoints.length > 0 && {
        images: { breakpoints, webp_quality: 85 },
      }),
    },
    warnings,
  };
}
