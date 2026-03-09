import { describe, it, expect } from 'vitest';
import { parseSocialLinks } from '../src/config.js';

describe('parseSocialLinks', () => {
  it('returns empty array when undefined', () => {
    expect(parseSocialLinks(undefined)).toEqual([]);
  });

  it('returns empty array when given an empty array', () => {
    expect(parseSocialLinks([])).toEqual([]);
  });

  it('parses valid social links', () => {
    expect(
      parseSocialLinks([
        { platform: 'bluesky', url: 'https://bsky.app/profile/test' },
        { platform: 'mastodon', url: 'https://mastodon.social/@test' },
      ]),
    ).toEqual([
      { platform: 'bluesky', url: 'https://bsky.app/profile/test' },
      { platform: 'mastodon', url: 'https://mastodon.social/@test' },
    ]);
  });

  it('accepts all supported platforms', () => {
    const links = parseSocialLinks([
      { platform: 'bluesky', url: 'https://example.com/1' },
      { platform: 'mastodon', url: 'https://example.com/2' },
      { platform: 'flickr', url: 'https://example.com/3' },
      { platform: 'pixelfed', url: 'https://example.com/4' },
    ]);
    expect(links).toHaveLength(4);
  });

  it('drops entries with unrecognised platform', () => {
    expect(
      parseSocialLinks([
        { platform: 'twitter', url: 'https://twitter.com/test' },
        { platform: 'bluesky', url: 'https://bsky.app/profile/test' },
      ]),
    ).toEqual([{ platform: 'bluesky', url: 'https://bsky.app/profile/test' }]);
  });

  it('drops entries with missing url', () => {
    expect(
      parseSocialLinks([
        { platform: 'bluesky' },
        { platform: 'mastodon', url: 'https://mastodon.social/@test' },
      ]),
    ).toEqual([
      { platform: 'mastodon', url: 'https://mastodon.social/@test' },
    ]);
  });

  it('drops entries with empty url', () => {
    expect(
      parseSocialLinks([{ platform: 'bluesky', url: '' }]),
    ).toEqual([]);
  });

  it('drops entries with missing platform', () => {
    expect(
      parseSocialLinks([{ url: 'https://example.com' }]),
    ).toEqual([]);
  });
});
