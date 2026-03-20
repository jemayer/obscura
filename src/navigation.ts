import type { SiteConfig, Page, ResolvedNavItem } from './types.js';

/** Built-in route keywords and their URL paths. */
const BUILTIN_ROUTES: Readonly<Record<string, string>> = {
  photography: '/photography/',
  tags: '/tags/',
  locations: '/locations/',
  blog: '/blog/',
};

/**
 * Default navigation matching the original hardcoded menu.
 * About/Contact use literal paths (not page: refs) so the default
 * works even when those pages don't exist — matching the old hardcoded
 * template behavior where the links were always present.
 */
const DEFAULT_NAV: readonly { readonly label: string; readonly url: string }[] =
  [
    { label: 'Photography', url: 'photography' },
    { label: 'Tags', url: 'tags' },
    { label: 'Locations', url: 'locations' },
    { label: 'Blog', url: 'blog' },
    { label: 'About', url: '/about/' },
    { label: 'Contact', url: '/contact/' },
  ];

/**
 * Resolve navigation items from config into fully-resolved nav entries.
 * When `config.navigation` is omitted, uses the default 6-item menu.
 * Throws on `page:<slug>` references that don't match any loaded page.
 */
export function resolveNavigation(
  config: SiteConfig,
  pages: readonly Page[],
): readonly ResolvedNavItem[] {
  const items = config.navigation ?? DEFAULT_NAV;
  const pageSlugs = new Set(pages.map((p) => p.slug));

  return items.map((item) => resolveNavItem(item, config.base_path, pageSlugs));
}

function resolveNavItem(
  item: { readonly label: string; readonly url: string },
  basePath: string,
  pageSlugs: ReadonlySet<string>,
): ResolvedNavItem {
  const { label, url } = item;

  // External URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { label, href: url, navKey: null, external: true };
  }

  // Page reference: page:<slug>
  if (url.startsWith('page:')) {
    const slug = url.slice(5);
    if (!pageSlugs.has(slug)) {
      throw new Error(
        `Navigation error: page "${slug}" not found. ` +
          `Referenced in nav item "${label}" (url: "${url}"). ` +
          `Available pages: ${[...pageSlugs].join(', ') || '(none)'}`,
      );
    }
    return {
      label,
      href: `${basePath}/${slug}/`,
      navKey: slug,
      external: false,
    };
  }

  // Built-in route keyword
  const builtinPath = BUILTIN_ROUTES[url];
  if (builtinPath) {
    return {
      label,
      href: `${basePath}${builtinPath}`,
      navKey: url,
      external: false,
    };
  }

  // Literal path starting with /
  if (url.startsWith('/')) {
    // Derive navKey from simple /<slug>/ paths for active-link highlighting
    const slugMatch = /^\/([^/]+)\/$/.exec(url);
    const navKey = slugMatch?.[1] ?? null;
    return { label, href: `${basePath}${url}`, navKey, external: false };
  }

  // Unknown — treat as literal path
  return {
    label,
    href: `${basePath}/${url}/`,
    navKey: url,
    external: false,
  };
}
