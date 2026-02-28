import { cp, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Copy PhotoSwipe library files to dist for client-side use.
 * PhotoSwipe is loaded via <script> and <link> tags in the base template.
 */
export async function copyPhotoSwipeAssets(distDir: string): Promise<void> {
  const pswpDir = dirname(require.resolve('photoswipe/package.json'));
  const destDir = resolve(distDir, 'assets', 'vendor', 'photoswipe');

  await mkdir(destDir, { recursive: true });

  // Copy the ESM bundle and CSS
  await cp(
    resolve(pswpDir, 'dist', 'photoswipe.esm.min.js'),
    resolve(destDir, 'photoswipe.esm.min.js'),
  );
  await cp(
    resolve(pswpDir, 'dist', 'photoswipe.css'),
    resolve(destDir, 'photoswipe.css'),
  );
}
