import { describe, it, expect, afterAll } from 'vitest';
import { loadSiteConfig } from '../src/config.js';
import { createRenderingEngine } from '../src/rendering.js';
import { resolve } from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { SiteConfig } from '../src/types.js';

async function makeTempSite(yaml: string): Promise<string> {
  const dir = await mkdtemp(resolve(tmpdir(), 'obscura-subtitle-'));
  const configDir = resolve(dir, 'site', 'config');
  await mkdir(configDir, { recursive: true });
  await writeFile(resolve(configDir, 'site.yaml'), yaml);
  return dir;
}

function makeConfig(overrides: Partial<SiteConfig> = {}): SiteConfig {
  return {
    base_url: 'https://example.com',
    base_path: '',
    title: 'Test Site',
    theme: 'editorial',
    recent_shots_count: 12,
    images: { breakpoints: [400], webp_quality: 85 },
    license: 'all-rights-reserved',
    gallery_default_layout: 'masonry',
    social_links: [],
    photo_display_fields: [],
    lightbox_display_fields: [],
    ...overrides,
  };
}

const THEME_TEMPLATES = resolve(
  import.meta.dirname,
  '..',
  'themes',
  'editorial',
  'templates',
);

describe('subtitle config parsing', () => {
  const dirs: string[] = [];

  async function loadWith(yaml: string) {
    const dir = await makeTempSite(yaml);
    dirs.push(dir);
    return loadSiteConfig(dir);
  }

  afterAll(async () => {
    for (const d of dirs) await rm(d, { recursive: true, force: true });
  });

  it('parses subtitle when present', async () => {
    const config = await loadWith(
      'base_url: https://example.com\ntitle: Test\nsubtitle: "Landscapes & Portraits"\n',
    );
    expect(config.subtitle).toBe('Landscapes & Portraits');
  });

  it('returns undefined when subtitle is absent', async () => {
    const config = await loadWith(
      'base_url: https://example.com\ntitle: Test\n',
    );
    expect(config.subtitle).toBeUndefined();
  });

  it('returns undefined when subtitle is empty string', async () => {
    const config = await loadWith(
      'base_url: https://example.com\ntitle: Test\nsubtitle: ""\n',
    );
    expect(config.subtitle).toBeUndefined();
  });
});

describe('subtitle template rendering', () => {
  it('renders subtitle in hero when configured', () => {
    const config = makeConfig({ subtitle: 'Landscapes & Portraits' });
    const engine = createRenderingEngine(THEME_TEMPLATES, config);
    const html = engine.env.render('homepage.html', {
      site: config,
      nav_items: [],
      recent_photos: [],
      hero: null,
      current_year: 2026,
    });
    expect(html).toContain('<title>Test Site - Landscapes &amp; Portraits</title>');
    expect(html).toContain('site-title__subtitle');
    expect(html).toContain('Landscapes &amp; Portraits');
  });

  it('renders hero subtitle element inside hero section', () => {
    const config = makeConfig({ subtitle: 'Fine Art' });
    const engine = createRenderingEngine(THEME_TEMPLATES, config);
    const html = engine.env.render('homepage.html', {
      site: config,
      nav_items: [],
      recent_photos: [],
      hero: {
        photo: {
          slug: 'test/photo',
          variants: [],
          metadata: { title: 'Test' },
        },
      },
      current_year: 2026,
    });
    expect(html).toContain('<p class="hero__subtitle">Fine Art</p>');
  });

  it('does not render subtitle elements when not configured', () => {
    const config = makeConfig();
    const engine = createRenderingEngine(THEME_TEMPLATES, config);
    const html = engine.env.render('homepage.html', {
      site: config,
      nav_items: [],
      recent_photos: [],
      hero: null,
      current_year: 2026,
    });
    expect(html).toContain('<title>Test Site</title>');
    expect(html).not.toContain('hero__subtitle');
    expect(html).not.toContain('site-title__subtitle');
    expect(html).not.toContain('site-title__separator');
  });

  it('renders subtitle in nav bar with dash separator', () => {
    const config = makeConfig({ subtitle: 'Portraits' });
    const engine = createRenderingEngine(THEME_TEMPLATES, config);
    const html = engine.env.render('homepage.html', {
      site: config,
      nav_items: [],
      recent_photos: [],
      hero: null,
      current_year: 2026,
    });
    expect(html).toContain('site-title__separator');
    expect(html).toContain('<span class="site-title__subtitle">Portraits</span>');
  });

  it('does not include subtitle in footer copyright', () => {
    const config = makeConfig({ subtitle: 'Portraits' });
    const engine = createRenderingEngine(THEME_TEMPLATES, config);
    const html = engine.env.render('homepage.html', {
      site: config,
      nav_items: [],
      recent_photos: [],
      hero: null,
      current_year: 2026,
    });
    const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/);
    expect(footerMatch).toBeTruthy();
    expect(footerMatch![0]).not.toContain('Portraits');
  });
});
