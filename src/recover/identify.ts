import * as cheerio from 'cheerio';
import type { Identified, RecoveryWarning } from './types.js';

/** Default theme assumed when an older site doesn't expose data-theme. */
export const CURRENT_FALLBACK_THEME = 'editorial';

/**
 * Parse the generator meta tag and return identification info.
 * Throws if the tag is missing or doesn't start with "Obscura ".
 */
export function identifyFromHtml(html: string): Identified {
  const $ = cheerio.load(html);
  const meta = $('meta[name="generator"]').first();
  if (meta.length === 0) {
    throw new Error(
      'not an Obscura site: missing <meta name="generator"> tag',
    );
  }
  const content = meta.attr('content') ?? '';
  if (!content.startsWith('Obscura ')) {
    throw new Error(
      `not an Obscura site: <meta name="generator" content="${content}"> does not start with "Obscura "`,
    );
  }

  const buildTimestamp = content.slice('Obscura '.length).trim() || null;
  const theme = meta.attr('data-theme') ?? null;
  const version = meta.attr('data-version') ?? null;

  const warnings: RecoveryWarning[] = [];
  if (theme === null) {
    warnings.push({
      category: 'identify',
      subject: 'theme',
      message: `data-theme attribute missing; assuming theme "${CURRENT_FALLBACK_THEME}" (older Obscura site).`,
    });
  }
  if (version === null) {
    warnings.push({
      category: 'identify',
      subject: 'version',
      message:
        'data-version attribute missing; assuming current Obscura version (older Obscura site).',
    });
  }

  return {
    theme: theme ?? CURRENT_FALLBACK_THEME,
    version,
    buildTimestamp,
    usedFallback: warnings.length > 0,
    warnings,
  };
}
