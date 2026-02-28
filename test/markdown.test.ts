import { describe, it, expect } from 'vitest';
import { extractShortcodes, resolveShortcodes } from '../src/markdown.js';
import { SlugIndex } from '../src/slugs.js';

describe('extractShortcodes', () => {
  it('extracts photo shortcodes from content', () => {
    const content = 'Some text {{< photo "mono/rain" >}} more text {{< photo "sunset" >}}';
    expect(extractShortcodes(content)).toEqual(['mono/rain', 'sunset']);
  });

  it('returns empty array when no shortcodes present', () => {
    expect(extractShortcodes('Just regular text')).toEqual([]);
  });

  it('handles shortcodes with varying whitespace', () => {
    const content = '{{<  photo  "test"  >}}';
    expect(extractShortcodes(content)).toEqual(['test']);
  });
});

describe('resolveShortcodes', () => {
  it('resolves valid shortcode slugs', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');

    const resolved = resolveShortcodes(['mono/rain'], index, 'test.md');
    expect(resolved).toEqual(['mono/rain']);
  });

  it('resolves bare slugs when unambiguous', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');

    const resolved = resolveShortcodes(['rain'], index, 'test.md');
    expect(resolved).toEqual(['mono/rain']);
  });

  it('throws on non-existent photo slug', () => {
    const index = new SlugIndex();
    expect(() => resolveShortcodes(['nope'], index, 'test.md')).toThrow();
  });

  it('throws on ambiguous slug', () => {
    const index = new SlugIndex();
    index.register('mono', 'sunset.jpg', '/photos/mono/sunset.jpg');
    index.register('color', 'sunset.jpg', '/photos/color/sunset.jpg');

    expect(() => resolveShortcodes(['sunset'], index, 'test.md')).toThrow('Ambiguous');
  });
});
