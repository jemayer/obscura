import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  SiteConfig,
  GalleryConfig,
  GalleryEntry,
  ImageConfig,
  DisplayField,
} from './types.js';
import { ALL_DISPLAY_FIELDS } from './types.js';

const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  breakpoints: [400, 800, 1200, 2400],
  webp_quality: 85,
};

const DEFAULT_LICENSE = 'all-rights-reserved';

const DEFAULT_SITE_CONFIG: SiteConfig = {
  base_url: 'http://localhost:3000',
  base_path: '',
  title: 'My Photography',
  theme: 'editorial',
  recent_shots_count: 12,
  images: DEFAULT_IMAGE_CONFIG,
  license: DEFAULT_LICENSE,
  photo_display_fields: ALL_DISPLAY_FIELDS,
  lightbox_display_fields: ALL_DISPLAY_FIELDS,
};

const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  galleries: [{ slug: 'post-assets', title: 'Post Assets', listed: false }],
};

interface RawSiteConfig {
  base_url?: string;
  title?: string;
  theme?: string;
  recent_shots_count?: number;
  license?: string;
  photo_display_fields?: string[];
  lightbox_display_fields?: string[];
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
  layout?: 'grid' | 'masonry';
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
 * Parse and validate a display-fields array from config.
 * Returns only recognised field names; falls back to all fields if omitted.
 */
export function parseDisplayFields(
  raw: string[] | undefined,
): readonly DisplayField[] {
  if (!raw || !Array.isArray(raw)) return ALL_DISPLAY_FIELDS;
  const valid = raw.filter((f): f is DisplayField =>
    (ALL_DISPLAY_FIELDS as readonly string[]).includes(f),
  );
  return valid.length > 0 ? valid : ALL_DISPLAY_FIELDS;
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
  const filePath = resolve(projectRoot, 'config', 'site.yaml');

  if (!existsSync(filePath)) {
    throw new Error(
      `Config file not found: ${filePath}\n\n` +
        `It looks like your site hasn't been initialised yet.\n` +
        `Run "npm run init" to populate config/ and content/ with example content,\n` +
        `or create config/site.yaml manually.`,
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
    theme: raw.theme ?? DEFAULT_SITE_CONFIG.theme,
    recent_shots_count:
      raw.recent_shots_count ?? DEFAULT_SITE_CONFIG.recent_shots_count,
    license: raw.license ?? DEFAULT_LICENSE,
    photo_display_fields: parseDisplayFields(raw.photo_display_fields),
    lightbox_display_fields: parseDisplayFields(raw.lightbox_display_fields),
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
  const filePath = resolve(projectRoot, 'config', 'galleries.yaml');
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
