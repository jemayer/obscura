import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { SiteConfig, GalleryConfig, ImageConfig } from './types.js';

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
  galleries: [
    { slug: 'post-assets', title: 'Post Assets', listed: false },
  ],
};

async function loadYamlFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return parseYaml(content) as T;
}

export async function loadSiteConfig(
  projectRoot: string,
): Promise<SiteConfig> {
  const filePath = resolve(projectRoot, 'config', 'site.yaml');
  const raw = await loadYamlFile<Partial<SiteConfig>>(filePath);

  return {
    base_url: raw.base_url ?? DEFAULT_SITE_CONFIG.base_url,
    title: raw.title ?? DEFAULT_SITE_CONFIG.title,
    theme: raw.theme ?? DEFAULT_SITE_CONFIG.theme,
    recent_shots_count:
      raw.recent_shots_count ?? DEFAULT_SITE_CONFIG.recent_shots_count,
    images: {
      breakpoints:
        raw.images?.breakpoints ?? DEFAULT_IMAGE_CONFIG.breakpoints,
      webp_quality:
        raw.images?.webp_quality ?? DEFAULT_IMAGE_CONFIG.webp_quality,
    },
  };
}

export async function loadGalleryConfig(
  projectRoot: string,
): Promise<GalleryConfig> {
  const filePath = resolve(projectRoot, 'config', 'galleries.yaml');
  const raw = await loadYamlFile<Partial<GalleryConfig>>(filePath);

  if (!raw.galleries || !Array.isArray(raw.galleries)) {
    return DEFAULT_GALLERY_CONFIG;
  }

  return {
    galleries: raw.galleries.map((g) => ({
      slug: g.slug,
      title: g.title,
      description: g.description,
      listed: g.listed ?? true,
    })),
  };
}
