import { describe, it, expect } from 'vitest';
import { resolveNavigation } from '../src/navigation.js';
import type { SiteConfig, Page } from '../src/types.js';

/** Minimal SiteConfig for testing — only fields needed by resolveNavigation. */
function makeConfig(
  overrides: Partial<SiteConfig> = {},
): SiteConfig {
  return {
    base_url: 'https://example.com',
    base_path: '',
    title: 'Test',
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

function makePage(slug: string): Page {
  return {
    slug,
    frontmatter: { title: slug.charAt(0).toUpperCase() + slug.slice(1) },
    content: '',
    renderedContent: '',
  };
}

describe('resolveNavigation', () => {
  const pages = [makePage('about'), makePage('contact')];

  describe('default navigation (no config)', () => {
    it('returns 6 items matching the original hardcoded menu', () => {
      const config = makeConfig();
      const nav = resolveNavigation(config, pages);
      expect(nav).toHaveLength(6);
      expect(nav.map((n) => n.label)).toEqual([
        'Photography',
        'Tags',
        'Locations',
        'Blog',
        'About',
        'Contact',
      ]);
    });

    it('resolves built-in routes to correct paths', () => {
      const nav = resolveNavigation(makeConfig(), pages);
      expect(nav[0]).toEqual({
        label: 'Photography',
        href: '/photography/',
        navKey: 'photography',
        external: false,
      });
      expect(nav[3]).toEqual({
        label: 'Blog',
        href: '/blog/',
        navKey: 'blog',
        external: false,
      });
    });

    it('resolves default About/Contact as literal paths with navKey', () => {
      const nav = resolveNavigation(makeConfig(), pages);
      expect(nav[4]).toEqual({
        label: 'About',
        href: '/about/',
        navKey: 'about',
        external: false,
      });
      expect(nav[5]).toEqual({
        label: 'Contact',
        href: '/contact/',
        navKey: 'contact',
        external: false,
      });
    });
  });

  describe('custom navigation', () => {
    it('uses configured items instead of defaults', () => {
      const config = makeConfig({
        navigation: [
          { label: 'Portfolio', url: 'photography' },
          { label: 'About Me', url: 'page:about' },
        ],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav).toHaveLength(2);
      expect(nav[0]!.label).toBe('Portfolio');
      expect(nav[1]!.label).toBe('About Me');
    });

    it('allows empty navigation array', () => {
      const config = makeConfig({ navigation: [] });
      const nav = resolveNavigation(config, pages);
      expect(nav).toHaveLength(0);
    });
  });

  describe('built-in route keywords', () => {
    it.each([
      ['photography', '/photography/'],
      ['tags', '/tags/'],
      ['locations', '/locations/'],
      ['blog', '/blog/'],
    ])('resolves "%s" to "%s"', (keyword, expected) => {
      const config = makeConfig({
        navigation: [{ label: 'Test', url: keyword }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.href).toBe(expected);
      expect(nav[0]!.navKey).toBe(keyword);
      expect(nav[0]!.external).toBe(false);
    });
  });

  describe('page references', () => {
    it('resolves page:slug to /<slug>/', () => {
      const config = makeConfig({
        navigation: [{ label: 'About', url: 'page:about' }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.href).toBe('/about/');
      expect(nav[0]!.navKey).toBe('about');
    });

    it('throws on missing page', () => {
      const config = makeConfig({
        navigation: [{ label: 'FAQ', url: 'page:faq' }],
      });
      expect(() => resolveNavigation(config, pages)).toThrow(
        /page "faq" not found/,
      );
    });
  });

  describe('external URLs', () => {
    it('handles https URLs', () => {
      const config = makeConfig({
        navigation: [
          { label: 'Prints', url: 'https://prints.example.com' },
        ],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]).toEqual({
        label: 'Prints',
        href: 'https://prints.example.com',
        navKey: null,
        external: true,
      });
    });

    it('handles http URLs', () => {
      const config = makeConfig({
        navigation: [{ label: 'Old Site', url: 'http://old.example.com' }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.external).toBe(true);
    });
  });

  describe('literal paths', () => {
    it('resolves paths starting with /', () => {
      const config = makeConfig({
        navigation: [{ label: 'Custom', url: '/custom/page/' }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.href).toBe('/custom/page/');
      expect(nav[0]!.navKey).toBeNull();
      expect(nav[0]!.external).toBe(false);
    });

    it('derives navKey from simple /<slug>/ paths', () => {
      const config = makeConfig({
        navigation: [{ label: 'About', url: '/about/' }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.navKey).toBe('about');
    });
  });

  describe('base_path support', () => {
    it('prepends base_path to built-in routes', () => {
      const config = makeConfig({
        base_path: '/portfolio',
        navigation: [{ label: 'Photos', url: 'photography' }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.href).toBe('/portfolio/photography/');
    });

    it('prepends base_path to page references', () => {
      const config = makeConfig({
        base_path: '/portfolio',
        navigation: [{ label: 'About', url: 'page:about' }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.href).toBe('/portfolio/about/');
    });

    it('prepends base_path to literal paths', () => {
      const config = makeConfig({
        base_path: '/portfolio',
        navigation: [{ label: 'Custom', url: '/custom/nested/' }],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.href).toBe('/portfolio/custom/nested/');
    });

    it('does not modify external URLs', () => {
      const config = makeConfig({
        base_path: '/portfolio',
        navigation: [
          { label: 'Prints', url: 'https://prints.example.com' },
        ],
      });
      const nav = resolveNavigation(config, pages);
      expect(nav[0]!.href).toBe('https://prints.example.com');
    });
  });
});
