import TurndownService from 'turndown';

/**
 * Build a TurndownService configured for Obscura content.
 *
 * Custom rules:
 * - `<u>...</u>` is preserved verbatim. Editorial uses literal `<u>` tags
 *   in Markdown to drive its text-marker (highlight) effect; Turndown's
 *   defaults would strip the tags and lose the styling on rebuild.
 */
export function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  service.addRule('preserveUnderline', {
    filter: 'u',
    replacement: (content) => `<u>${content}</u>`,
  });

  return service;
}
