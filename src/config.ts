import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  SiteConfig,
  GalleryConfig,
  GalleryEntry,
  GalleryLayout,
  ImageConfig,
  DisplayField,
  SocialLink,
  SocialPlatform,
  NavItem,
} from './types.js';
import { ALL_DISPLAY_FIELDS, EXIF_SUB_FIELDS } from './types.js';

const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  breakpoints: [400, 800, 1200, 2400],
  webp_quality: 85,
};

const DEFAULT_LICENSE = 'all-rights-reserved';

const DEFAULT_GALLERY_LAYOUT: GalleryLayout = 'masonry';

const VALID_SOCIAL_PLATFORMS: readonly string[] = [
  '500px',
  'bluesky',
  'flickr',
  'github',
  'instagram',
  'mastodon',
  'pixelfed',
];

const DEFAULT_SITE_CONFIG: SiteConfig = {
  base_url: 'http://localhost:3000',
  base_path: '',
  title: 'My Photography',
  theme: 'editorial',
  recent_shots_count: 12,
  images: DEFAULT_IMAGE_CONFIG,
  license: DEFAULT_LICENSE,
  gallery_default_layout: DEFAULT_GALLERY_LAYOUT,
  social_links: [],
  photo_display_fields: ALL_DISPLAY_FIELDS,
  lightbox_display_fields: ALL_DISPLAY_FIELDS,
};

const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  galleries: [{ slug: 'post-assets', title: 'Post Assets', listed: false }],
};

interface RawSocialLink {
  platform?: string;
  url?: string;
}

interface RawSiteConfig {
  base_url?: string;
  title?: string;
  description?: string;
  theme?: string;
  recent_shots_count?: number;
  license?: string;
  gallery_default_layout?: string;
  social_links?: RawSocialLink[];
  photo_display_fields?: string[];
  lightbox_display_fields?: string[];
  hero_image?: string;
  navigation?: Array<{ label?: string; url?: string }>;
  images?: {
    breakpoints?: number[];
    webp_quality?: number;
  };
}

interface RawGalleryEntry {
  slug: string;
  title: string;
  description?: string;
  listed?: boolean;
  layout?: GalleryLayout;
}

interface RawGalleryConfig {
  galleries?: RawGalleryEntry[];
}

/**
 * Extract the pathname from a base URL, stripping trailing slashes.
 * Returns "" for root URLs, "/portfolio" for "https://example.com/portfolio/", etc.
 */
export function extractBasePath(baseUrl: string): string {
  try {
    const pathname = new URL(baseUrl).pathname;
    return pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/**
 * Parse and validate social links from config.
 * Silently drops entries with unrecognised platforms or missing URLs.
 */
export function parseSocialLinks(
  raw: RawSocialLink[] | undefined,
): readonly SocialLink[] {
  if (!raw || !Array.isArray(raw)) return [];
  const result: SocialLink[] = [];
  for (const entry of raw) {
    if (
      typeof entry.platform === 'string' &&
      VALID_SOCIAL_PLATFORMS.includes(entry.platform) &&
      typeof entry.url === 'string' &&
      entry.url.length > 0
    ) {
      result.push({
        platform: entry.platform as SocialPlatform,
        url: entry.url,
      });
    }
  }
  return result;
}

/**
 * Parse and validate a display-fields array from config.
 * Returns only recognised field names; falls back to all fields if omitted.
 * The alias "exif" expands to date, camera, lens, settings.
 */
export function parseDisplayFields(
  raw: string[] | undefined,
): readonly DisplayField[] {
  if (!raw || !Array.isArray(raw)) return ALL_DISPLAY_FIELDS;
  const allFieldNames = ALL_DISPLAY_FIELDS as readonly string[];
  const expanded: DisplayField[] = [];
  for (const f of raw) {
    if (f === 'exif') {
      for (const sub of EXIF_SUB_FIELDS) {
        if (!expanded.includes(sub)) expanded.push(sub);
      }
    } else if (allFieldNames.includes(f)) {
      const field = f as DisplayField;
      if (!expanded.includes(field)) expanded.push(field);
    }
  }
  return expanded.length > 0 ? expanded : ALL_DISPLAY_FIELDS;
}

/**
 * Parse and validate navigation items from config.
 * Returns undefined when omitted (use default menu), or the validated list.
 */
export function parseNavigation(
  raw: Array<{ label?: string; url?: string }> | undefined,
): readonly NavItem[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined;
  const result: NavItem[] = [];
  for (const entry of raw) {
    if (
      typeof entry.label === 'string' &&
      entry.label.length > 0 &&
      typeof entry.url === 'string' &&
      entry.url.length > 0
    ) {
      result.push({ label: entry.label, url: entry.url });
    }
  }
  return result;
}

async function loadYamlFile(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, 'utf-8');
  return parseYaml(content) as unknown;
}

function isSiteConfig(value: unknown): value is RawSiteConfig {
  return typeof value === 'object' && value !== null;
}

function isGalleryConfig(value: unknown): value is RawGalleryConfig {
  return typeof value === 'object' && value !== null;
}

export async function loadSiteConfig(projectRoot: string): Promise<SiteConfig> {
  const filePath = resolve(projectRoot, 'site', 'config', 'site.yaml');

  if (!existsSync(filePath)) {
    throw new Error(
      `Config file not found: ${filePath}\n\n` +
        `It looks like your site hasn't been initialised yet.\n` +
        `Run "npm run init" to populate site/config/ and site/content/ with example content,\n` +
        `or create site/config/site.yaml manually.`,
    );
  }

  const raw = await loadYamlFile(filePath);

  if (!isSiteConfig(raw)) {
    return DEFAULT_SITE_CONFIG;
  }

  const baseUrl = raw.base_url ?? DEFAULT_SITE_CONFIG.base_url;

  return {
    base_url: baseUrl,
    base_path: extractBasePath(baseUrl),
    title: raw.title ?? DEFAULT_SITE_CONFIG.title,
    description:
      typeof raw.description === 'string' && raw.description.length > 0
        ? raw.description
        : undefined,
    theme: raw.theme ?? DEFAULT_SITE_CONFIG.theme,
    recent_shots_count:
      raw.recent_shots_count ?? DEFAULT_SITE_CONFIG.recent_shots_count,
    license: raw.license ?? DEFAULT_LICENSE,
    gallery_default_layout:
      raw.gallery_default_layout === 'grid' ||
      raw.gallery_default_layout === 'masonry'
        ? raw.gallery_default_layout
        : DEFAULT_GALLERY_LAYOUT,
    social_links: parseSocialLinks(raw.social_links),
    photo_display_fields: parseDisplayFields(raw.photo_display_fields),
    lightbox_display_fields: parseDisplayFields(raw.lightbox_display_fields),
    hero_image:
      typeof raw.hero_image === 'string' && raw.hero_image.length > 0
        ? raw.hero_image
        : undefined,
    navigation: parseNavigation(raw.navigation),
    images: {
      breakpoints: raw.images?.breakpoints ?? DEFAULT_IMAGE_CONFIG.breakpoints,
      webp_quality:
        raw.images?.webp_quality ?? DEFAULT_IMAGE_CONFIG.webp_quality,
    },
  };
}

export async function loadGalleryConfig(
  projectRoot: string,
): Promise<GalleryConfig> {
  const filePath = resolve(projectRoot, 'site', 'config', 'galleries.yaml');
  const raw = await loadYamlFile(filePath);

  if (!isGalleryConfig(raw) || !Array.isArray(raw.galleries)) {
    return DEFAULT_GALLERY_CONFIG;
  }

  const galleries: GalleryEntry[] = raw.galleries.map(
    (g: RawGalleryEntry): GalleryEntry => {
      const entry: GalleryEntry = {
        slug: g.slug,
        title: g.title,
        listed: g.listed ?? true,
        layout: g.layout,
      };
      if (g.description !== undefined) {
        return { ...entry, description: g.description };
      }
      return entry;
    },
  );

  return { galleries };
}
