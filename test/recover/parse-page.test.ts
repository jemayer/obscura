import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePage, parseHomepageIntro } from '../../src/recover/parse-page.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parsePage', () => {
  it('extracts title and converts body to markdown', () => {
    const html = fixture('page-about.html');
    const result = parsePage(html, 'https://example.com/about/');
    expect(result.value.slug).toBe('about');
    expect(result.value.frontmatter.title).toBe('About');
    expect(result.value.markdownBody).toContain('I am a photographer');
    expect(result.value.markdownBody).toMatch(/-\s+One/u);
    expect(result.value.conversionFailed).toBe(false);
  });

  it('rewrites .photo-card divs back to shortcodes in page bodies', () => {
    const html = fixture('page-with-photo.html');
    const result = parsePage(html, 'https://example.com/showcase/');
    expect(result.value.markdownBody).toContain(
      '{{< photo "sample/sample-02" >}}',
    );
    expect(result.value.markdownBody).not.toContain('photo-card');
  });
});

describe('parseHomepageIntro', () => {
  it('extracts the homepage-intro section as a page with slug "index"', () => {
    const html = fixture('homepage-full.html');
    const result = parseHomepageIntro(html);
    expect(result).not.toBeNull();
    expect(result?.value.slug).toBe('index');
    expect(result?.value.markdownBody).toContain('Welcome to my');
    expect(result?.value.markdownBody).toContain('Updated weekly');
    expect(result?.value.conversionFailed).toBe(false);
  });

  it('returns null when there is no homepage-intro section', () => {
    const html = fixture('homepage-bare.html');
    const result = parseHomepageIntro(html);
    expect(result).toBeNull();
  });
});
