import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import type { GalleryEntry, PhotoMetadata } from '../types.js';
import type {
  ParsedPage,
  ParsedPost,
  RecoveredSiteConfig,
} from './types.js';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

function toSerialisable(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return isoDate(value);
  if (Array.isArray(value)) return value.map(toSerialisable);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = toSerialisable(v);
    }
    return out;
  }
  return value;
}

export async function writeSiteConfig(
  targetDir: string,
  cfg: RecoveredSiteConfig,
): Promise<void> {
  const yaml = stringifyYaml(toSerialisable(cfg));
  await writeText(resolve(targetDir, 'site', 'config', 'site.yaml'), yaml);
}

export async function writeGalleriesConfig(
  targetDir: string,
  galleries: readonly GalleryEntry[],
): Promise<void> {
  const yaml = stringifyYaml(toSerialisable({ galleries }));
  await writeText(
    resolve(targetDir, 'site', 'config', 'galleries.yaml'),
    yaml,
  );
}

export async function writeSidecar(
  targetDir: string,
  gallerySlug: string,
  photoSlug: string,
  metadata: Partial<PhotoMetadata>,
): Promise<void> {
  const yaml = stringifyYaml(toSerialisable(metadata));
  await writeText(
    resolve(
      targetDir,
      'site',
      'content',
      'photos',
      gallerySlug,
      `${photoSlug}.yaml`,
    ),
    yaml,
  );
}

function renderFrontmatter(fm: Record<string, unknown>): string {
  const out = toSerialisable(fm) as Record<string, unknown>;
  if (Object.keys(out).length === 0) return '';
  return `---\n${stringifyYaml(out)}---\n`;
}

export async function writePost(
  targetDir: string,
  post: ParsedPost,
): Promise<void> {
  const path = resolve(
    targetDir,
    'site',
    'content',
    'posts',
    `${post.slug}.md`,
  );
  const frontmatter = renderFrontmatter(post.frontmatter);
  await writeText(path, `${frontmatter}\n${post.markdownBody}\n`);
  if (post.conversionFailed && post.rawHtml) {
    const htmlPath = resolve(
      targetDir,
      'site',
      'content',
      'posts',
      `${post.slug}.html`,
    );
    await writeText(htmlPath, post.rawHtml);
  }
}

export async function writePage(
  targetDir: string,
  page: ParsedPage,
): Promise<void> {
  const path = resolve(
    targetDir,
    'site',
    'content',
    'pages',
    `${page.slug}.md`,
  );
  const frontmatter = renderFrontmatter(page.frontmatter);
  await writeText(path, `${frontmatter}\n${page.markdownBody}\n`);
  if (page.conversionFailed && page.rawHtml) {
    const htmlPath = resolve(
      targetDir,
      'site',
      'content',
      'pages',
      `${page.slug}.html`,
    );
    await writeText(htmlPath, page.rawHtml);
  }
}
