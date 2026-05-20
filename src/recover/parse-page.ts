import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { ParsedPage, ParseResult, RecoveryWarning } from './types.js';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

function deriveSlug(pageUrl: string): string {
  const path = new URL(pageUrl).pathname;
  const m = /^.*\/([^/]+)\/$/u.exec(path);
  if (!m) {
    throw new Error(`page URL does not match /<slug>/: ${pageUrl}`);
  }
  return m[1];
}

export function parsePage(
  html: string,
  pageUrl: string,
): ParseResult<ParsedPage> {
  const $ = cheerio.load(html);
  const warnings: RecoveryWarning[] = [];
  const slug = deriveSlug(pageUrl);

  const main = $('main.page, main').first();
  const title = main.find('h1').first().text().trim();
  const body = main.find('.page-body').first();
  if (body.length === 0) {
    warnings.push({
      category: 'page',
      subject: slug,
      message: 'no .page-body found; emitting empty Markdown body',
    });
  }
  const bodyHtml = body.html() ?? '';

  let markdownBody = '';
  let conversionFailed = false;
  let rawHtml: string | undefined;
  try {
    markdownBody = turndown.turndown(bodyHtml).trim();
  } catch {
    conversionFailed = true;
    rawHtml = bodyHtml;
    warnings.push({
      category: 'page',
      subject: slug,
      message:
        'Turndown threw on the page body; saved raw HTML alongside the .md stub',
    });
  }

  return {
    value: {
      slug,
      frontmatter: title.length > 0 ? { title } : {},
      markdownBody,
      conversionFailed,
      ...(rawHtml !== undefined && { rawHtml }),
    },
    warnings,
  };
}
