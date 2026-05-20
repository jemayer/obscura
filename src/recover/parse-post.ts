import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { ParsedPost, ParseResult, RecoveryWarning } from './types.js';
import {
  rewritePhotoCards,
  postProcessShortcodes,
} from './photo-shortcodes.js';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

function deriveSlug(pageUrl: string): string {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/blog\/([^/]+)\/$/u.exec(path);
  if (!m || m[1] === undefined) {
    throw new Error(`post URL does not match /blog/<slug>/: ${pageUrl}`);
  }
  return m[1];
}

export function parseBlogPost(
  html: string,
  pageUrl: string,
): ParseResult<ParsedPost> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const slug = deriveSlug(pageUrl);

  const article = $('article').first();
  const title = article.find('h1').first().text().trim();
  const dateAttr = article.find('time').first().attr('datetime');
  const date = dateAttr ? new Date(dateAttr) : undefined;
  const tags: string[] = [];
  article.find('.tag-chips a').each((_, el) => {
    tags.push($(el).text().trim());
  });
  const summary = $('meta[name="description"]').attr('content')?.trim();

  const body = article.find('.post-body').first();
  if (body.length === 0) {
    warnings.push({
      category: 'post',
      subject: slug,
      message: 'no .post-body found; emitting empty Markdown body',
    });
  }
  rewritePhotoCards(body, $);
  const bodyHtml = body.html() ?? '';

  let markdownBody = '';
  let conversionFailed = false;
  let rawHtml: string | undefined;
  try {
    markdownBody = postProcessShortcodes(turndown.turndown(bodyHtml).trim());
  } catch {
    conversionFailed = true;
    rawHtml = bodyHtml;
    warnings.push({
      category: 'post',
      subject: slug,
      message:
        'Turndown threw on the post body; saved raw HTML alongside the .md stub',
    });
  }

  return {
    value: {
      slug,
      frontmatter: {
        ...(title.length > 0 && { title }),
        ...(date && !Number.isNaN(date.getTime()) && { date }),
        ...(tags.length > 0 && { tags }),
        ...(summary && summary.length > 0 && { summary }),
      },
      markdownBody,
      conversionFailed,
      ...(rawHtml !== undefined && { rawHtml }),
    },
    warnings,
  };
}
