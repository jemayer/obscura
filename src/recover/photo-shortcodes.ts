import type * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

const PLACEHOLDER_PREFIX = '~~~PHOTOCARD~~~';
const PLACEHOLDER_SUFFIX = '~~~END~~~';
const PLACEHOLDER_RE = new RegExp(
  `${PLACEHOLDER_PREFIX}([^~]+)${PLACEHOLDER_SUFFIX}`,
  'gu',
);

/**
 * Walks the body, replaces each `<div class="photo-card">` with a placeholder
 * text node carrying the gallery/slug derived from the inner `<a href>`.
 * Use postProcessShortcodes() on the Markdown output to swap placeholders for
 * `{{< photo "gallery/slug" >}}` shortcodes.
 *
 * Done in two steps so that Turndown's HTML→Markdown conversion can't mangle
 * the literal `<` and `>` characters in Obscura's shortcode syntax.
 */
export function rewritePhotoCards(
  $body: cheerio.Cheerio<Element>,
  $: cheerio.CheerioAPI,
): void {
  $body.find('div.photo-card').each((_, el) => {
    const card = $(el);
    const href = card.find('a').first().attr('href') ?? '';
    const m = /^.*\/photography\/([^/]+)\/([^/]+)\/$/u.exec(href);
    if (!m || m[1] === undefined || m[2] === undefined) return;
    const placeholder = `${PLACEHOLDER_PREFIX}${m[1]}/${m[2]}${PLACEHOLDER_SUFFIX}`;
    card.replaceWith($('<p></p>').text(placeholder));
  });
}

/** Replace placeholders left by rewritePhotoCards with Obscura's shortcode syntax. */
export function postProcessShortcodes(markdown: string): string {
  return markdown.replace(PLACEHOLDER_RE, (_match, slug: string) => {
    return `{{< photo "${slug}" >}}`;
  });
}
