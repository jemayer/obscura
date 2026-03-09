import { extname, basename } from 'node:path';

/**
 * Derive a photo slug from its filename (without extension).
 * Normalises to lowercase, replaces spaces/underscores with hyphens,
 * and strips non-alphanumeric characters except hyphens.
 */
export function slugifyFilename(filename: string): string {
  const name = basename(filename, extname(filename));
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Slugify a tag string for use in URLs.
 */
export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Slugify a location string for use in URLs.
 */
export function slugifyLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build a fully namespaced slug: <gallery-slug>/<photo-slug>
 */
export function namespacedSlug(gallerySlug: string, filename: string): string {
  return `${gallerySlug}/${slugifyFilename(filename)}`;
}

export class SlugIndex {
  /** Full namespaced slug → source file path */
  private readonly fullSlugs = new Map<string, string>();

  /** Bare photo slug → list of gallery slugs that contain it */
  private readonly bareSlugs = new Map<string, string[]>();

  register(gallerySlug: string, filename: string, sourcePath: string): string {
    const photoSlug = slugifyFilename(filename);
    const full = `${gallerySlug}/${photoSlug}`;

    if (this.fullSlugs.has(full)) {
      throw new Error(
        `Duplicate photo slug "${full}": "${sourcePath}" conflicts with "${this.fullSlugs.get(full) ?? ''}"`,
      );
    }

    this.fullSlugs.set(full, sourcePath);

    const existing = this.bareSlugs.get(photoSlug);
    if (existing) {
      existing.push(gallerySlug);
    } else {
      this.bareSlugs.set(photoSlug, [gallerySlug]);
    }

    return full;
  }

  /**
   * Resolve a slug reference (from a shortcode).
   * Accepts either a full namespaced slug or a bare photo slug.
   * Throws on non-existent or ambiguous bare slugs.
   */
  resolve(slug: string): string {
    // Full namespaced slug
    if (slug.includes('/')) {
      if (!this.fullSlugs.has(slug)) {
        throw new Error(`Photo not found: "${slug}"`);
      }
      return slug;
    }

    // Bare slug — check for ambiguity
    const galleries = this.bareSlugs.get(slug);
    if (!galleries || galleries.length === 0) {
      throw new Error(`Photo not found: "${slug}"`);
    }
    if (galleries.length > 1) {
      const locations = galleries.map((g) => `${g}/${slug}`).join(', ');
      throw new Error(
        `Ambiguous photo slug "${slug}" — exists in multiple galleries: ${locations}. Use the full namespaced slug instead.`,
      );
    }
    const gallery = galleries[0];
    if (!gallery) {
      throw new Error(`Photo not found: "${slug}"`);
    }
    return `${gallery}/${slug}`;
  }

  has(slug: string): boolean {
    return this.fullSlugs.has(slug);
  }

  getSourcePath(slug: string): string | undefined {
    return this.fullSlugs.get(slug);
  }

  get size(): number {
    return this.fullSlugs.size;
  }
}
