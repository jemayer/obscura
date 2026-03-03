import { readFile, readdir } from 'node:fs/promises';
import { resolve, extname, basename } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { parse as parseYaml } from 'yaml';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';
import type { BlogPost, BlogPostFrontmatter, Page, PageFrontmatter } from './types.js';
import type { SlugIndex } from './slugs.js';

// ---------------------------------------------------------------------------
// Shortcode parsing
// ---------------------------------------------------------------------------

const SHORTCODE_REGEX = /\{\{<\s*photo\s+"([^"]+)"\s*>\}\}/g;

export function extractShortcodes(content: string): string[] {
  const slugs: string[] = [];
  let match: RegExpExecArray | null;
  // Reset lastIndex to ensure we start from the beginning
  SHORTCODE_REGEX.lastIndex = 0;
  while ((match = SHORTCODE_REGEX.exec(content)) !== null) {
    const slug = match[1];
    if (slug) {
      slugs.push(slug);
    }
  }
  return slugs;
}

export function resolveShortcodes(
  rawSlugs: readonly string[],
  slugIndex: SlugIndex,
  filePath: string,
): string[] {
  return rawSlugs.map((slug) => {
    try {
      return slugIndex.resolve(slug);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error in ${filePath}: ${message}`, { cause: error });
    }
  });
}

// ---------------------------------------------------------------------------
// Frontmatter extraction
// ---------------------------------------------------------------------------

interface RawBlogFrontmatter {
  title?: string;
  date?: string | Date;
  tags?: string[];
  summary?: string;
}

function isRawFrontmatter(value: unknown): value is RawBlogFrontmatter {
  return typeof value === 'object' && value !== null;
}

function parseBlogFrontmatter(
  raw: string,
  filePath: string,
): BlogPostFrontmatter {
  const parsed: unknown = parseYaml(raw);
  if (!isRawFrontmatter(parsed) || !parsed.title || !parsed.date) {
    throw new Error(
      `Invalid frontmatter in ${filePath}: title and date are required`,
    );
  }

  const date =
    parsed.date instanceof Date ? parsed.date : new Date(parsed.date);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date in frontmatter of ${filePath}`);
  }

  const result: BlogPostFrontmatter = {
    title: parsed.title,
    date,
    tags: parsed.tags ?? [],
  };

  if (parsed.summary !== undefined) {
    return { ...result, summary: parsed.summary };
  }

  return result;
}

interface RawPageFrontmatter {
  title?: string;
}

function isRawPageFrontmatter(value: unknown): value is RawPageFrontmatter {
  return typeof value === 'object' && value !== null;
}

function parsePageFrontmatter(
  raw: string,
  filePath: string,
): PageFrontmatter {
  const parsed: unknown = parseYaml(raw);
  if (!isRawPageFrontmatter(parsed) || !parsed.title) {
    throw new Error(
      `Invalid frontmatter in ${filePath}: title is required`,
    );
  }
  return { title: parsed.title };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

/**
 * Rehype plugin that prepends basePath to root-relative href and src attributes.
 */
function rehypeBasePath(basePath: string) {
  return () => (tree: Root) => {
    if (!basePath) return;
    visit(tree, 'element', (node: Element) => {
      for (const attr of ['href', 'src'] as const) {
        const val = node.properties[attr];
        if (typeof val === 'string' && val.startsWith('/')) {
          node.properties[attr] = `${basePath}${val}`;
        }
      }
    });
  };
}

function createMarkdownProcessor(basePath: string) {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeBasePath(basePath))
    .use(rehypeStringify, { allowDangerousHtml: true });
}

async function renderMarkdown(content: string, basePath: string): Promise<string> {
  const processor = createMarkdownProcessor(basePath);
  const result = await processor.process(content);
  return String(result);
}

function extractFrontmatterRaw(content: string): {
  frontmatterRaw: string;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(content);
  if (!match?.[1] || match[2] === undefined) {
    return { frontmatterRaw: '', body: content };
  }
  return { frontmatterRaw: match[1], body: match[2] };
}

// ---------------------------------------------------------------------------
// Blog post loading
// ---------------------------------------------------------------------------

export async function loadBlogPost(
  filePath: string,
  slugIndex: SlugIndex,
  basePath: string,
): Promise<BlogPost> {
  const raw = await readFile(filePath, 'utf-8');
  const { frontmatterRaw, body } = extractFrontmatterRaw(raw);
  const frontmatter = parseBlogFrontmatter(frontmatterRaw, filePath);

  const slug = basename(filePath, extname(filePath));
  const rawSlugs = extractShortcodes(body);
  const referencedPhotos = resolveShortcodes(rawSlugs, slugIndex, filePath);
  const renderedContent = await renderMarkdown(raw, basePath);

  return {
    slug,
    frontmatter,
    content: body,
    renderedContent,
    referencedPhotos,
  };
}

export async function loadAllBlogPosts(
  postsDir: string,
  slugIndex: SlugIndex,
  basePath: string,
): Promise<BlogPost[]> {
  let entries: string[];
  try {
    const dirEntries = await readdir(postsDir);
    entries = dirEntries
      .filter((f) => extname(f).toLowerCase() === '.md')
      .sort();
  } catch {
    return [];
  }

  const posts: BlogPost[] = [];
  for (const entry of entries) {
    const filePath = resolve(postsDir, entry);
    const post = await loadBlogPost(filePath, slugIndex, basePath);
    posts.push(post);
  }

  // Sort by date descending (newest first)
  posts.sort(
    (a, b) => b.frontmatter.date.getTime() - a.frontmatter.date.getTime(),
  );

  return posts;
}

// ---------------------------------------------------------------------------
// Page loading
// ---------------------------------------------------------------------------

export async function loadPage(filePath: string, basePath: string): Promise<Page> {
  const raw = await readFile(filePath, 'utf-8');
  const { frontmatterRaw, body } = extractFrontmatterRaw(raw);
  const frontmatter = parsePageFrontmatter(frontmatterRaw, filePath);
  const slug = basename(filePath, extname(filePath));
  const renderedContent = await renderMarkdown(raw, basePath);

  return {
    slug,
    frontmatter,
    content: body,
    renderedContent,
  };
}

export async function loadAllPages(pagesDir: string, basePath: string): Promise<Page[]> {
  let entries: string[];
  try {
    const dirEntries = await readdir(pagesDir);
    entries = dirEntries
      .filter((f) => extname(f).toLowerCase() === '.md')
      // Exclude index.md — it's used for homepage content, not a standalone page
      .filter((f) => basename(f, extname(f)) !== 'index')
      .sort();
  } catch {
    return [];
  }

  const pages: Page[] = [];
  for (const entry of entries) {
    const filePath = resolve(pagesDir, entry);
    const page = await loadPage(filePath, basePath);
    pages.push(page);
  }

  return pages;
}

/**
 * Load optional homepage content from content/pages/index.md.
 * Returns the rendered HTML string, or undefined if the file doesn't exist.
 */
export async function loadHomepageContent(pagesDir: string, basePath: string): Promise<string | undefined> {
  const filePath = resolve(pagesDir, 'index.md');
  try {
    const raw = await readFile(filePath, 'utf-8');
    return await renderMarkdown(raw, basePath);
  } catch {
    return undefined;
  }
}
