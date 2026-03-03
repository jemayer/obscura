import type { ImageVariant, Photo } from './types.js';

/**
 * Generate a srcset attribute value from image variants.
 * Example output: "/assets/images/mono/rain-400w.webp 400w, /assets/images/mono/rain-800w.webp 800w"
 */
export function srcset(variants: readonly ImageVariant[]): string {
  return variants
    .map((v) => `${v.path} ${String(v.width)}w`)
    .join(', ');
}

/**
 * Generate a srcset with a base path prefix on each variant path.
 */
export function prefixedSrcset(variants: readonly ImageVariant[], basePath: string): string {
  return variants
    .map((v) => `${basePath}${v.path} ${String(v.width)}w`)
    .join(', ');
}

/**
 * Generate a sizes attribute value for responsive images.
 * Uses a simple breakpoint-based strategy.
 */
export function sizes(maxWidth?: number): string {
  const max = maxWidth ?? 2400;
  return `(max-width: ${String(max)}px) 100vw, ${String(max)}px`;
}

/**
 * Get the best variant for a given target width (closest without going under).
 */
export function bestVariant(
  variants: readonly ImageVariant[],
  targetWidth: number,
): ImageVariant | undefined {
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  return sorted.find((v) => v.width >= targetWidth) ?? sorted[sorted.length - 1];
}

/**
 * Generate a full <img> tag with srcset and sizes for a photo.
 */
export function responsiveImg(
  photo: Photo,
  basePath: string,
  cssClass?: string,
): string {
  if (photo.variants.length === 0) {
    return '';
  }

  const fallback = bestVariant(photo.variants, 800);
  if (!fallback) return '';

  const classAttr = cssClass ? ` class="${cssClass}"` : '';
  const alt = photo.metadata.title || photo.metadata.caption || photo.slug;

  return [
    `<img`,
    `  src="${basePath}${fallback.path}"`,
    `  srcset="${prefixedSrcset(photo.variants, basePath)}"`,
    `  sizes="${sizes()}"`,
    `  alt="${escapeHtml(alt)}"`,
    `  loading="lazy"`,
    `  decoding="async"`,
    `${classAttr}>`,
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
