import { describe, it, expect } from 'vitest';
import { createRenderingEngine } from '../../src/rendering.js';
import { resolve } from 'node:path';
import type { SiteConfig } from '../../src/types.js';
import { readFileSync } from 'node:fs';

const themeDir = resolve(
  import.meta.dirname,
  '..',
  '..',
  'themes',
  'editorial',
  'templates',
);

const minimalSiteConfig: SiteConfig = {
  base_url: 'https://example.com',
  base_path: '',
  title: 'Test',
  theme: 'editorial',
  recent_shots_count: 10,
  images: { breakpoints: [400, 800, 1200, 2400], webp_quality: 85 },
  license: 'all-rights-reserved',
  gallery_default_layout: 'masonry',
  social_links: [],
  photo_display_fields: ['date', 'camera'],
  lightbox_display_fields: ['date'],
};

describe('rendering globals', () => {
  it('exposes obscura_version matching package.json', () => {
    const pkg = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '..', '..', 'package.json'),
        'utf-8',
      ),
    ) as { version: string };
    const engine = createRenderingEngine(themeDir, minimalSiteConfig);
    const rendered = engine.env.renderString('{{ obscura_version }}', {});
    expect(rendered).toBe(pkg.version);
  });
});
