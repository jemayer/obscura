import { cp, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

/**
 * Copy PhotoSwipe library files to dist for client-side use.
 * PhotoSwipe is loaded via <script> and <link> tags in the base template.
 */
export async function copyPhotoSwipeAssets(distDir: string): Promise<void> {
  // Resolve the photoswipe dist directory via require.resolve on the main entry
  const require = createRequire(import.meta.url);
  const pswpMain = require.resolve('photoswipe');
  const pswpDistDir = dirname(pswpMain);
  const destDir = resolve(distDir, 'assets', 'vendor', 'photoswipe');

  await mkdir(destDir, { recursive: true });

  // Copy the ESM bundle and CSS
  await cp(
    resolve(pswpDistDir, 'photoswipe.esm.min.js'),
    resolve(destDir, 'photoswipe.esm.min.js'),
  );
  await cp(
    resolve(pswpDistDir, 'photoswipe.css'),
    resolve(destDir, 'photoswipe.css'),
  );
}
