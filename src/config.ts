import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  SiteConfig,
  GalleryConfig,
  GalleryEntry,
  ImageConfig,
} from './types.js';

const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  breakpoints: [400, 800, 1200, 2400],
  webp_quality: 85,
};

const DEFAULT_SITE_CONFIG: SiteConfig = {
  base_url: 'http://localhost:3000',
  title: 'My Photography',
  theme: 'editorial',
  recent_shots_count: 12,
  images: DEFAULT_IMAGE_CONFIG,
};

const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  galleries: [{ slug: 'post-assets', title: 'Post Assets', listed: false }],
};

interface RawSiteConfig {
  base_url?: string;
  title?: string;
  theme?: string;
  recent_shots_count?: number;
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

  return {
    base_url: raw.base_url ?? DEFAULT_SITE_CONFIG.base_url,
    title: raw.title ?? DEFAULT_SITE_CONFIG.title,
    theme: raw.theme ?? DEFAULT_SITE_CONFIG.theme,
    recent_shots_count:
      raw.recent_shots_count ?? DEFAULT_SITE_CONFIG.recent_shots_count,
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
