import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBlogPost } from '../../src/recover/parse-post.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parseBlogPost', () => {
  it('extracts frontmatter and converts body to markdown', () => {
    const html = fixture('post-welcome.html');
    const result = parseBlogPost(
      html,
      'https://example.com/blog/welcome/',
    );
    expect(result.value.slug).toBe('welcome');
    expect(result.value.frontmatter.title).toBe('Welcome to my blog');
    expect(result.value.frontmatter.date).toEqual(new Date('2026-01-15'));
    expect(result.value.frontmatter.tags).toEqual(['intro', 'meta']);
    expect(result.value.frontmatter.summary).toBe(
      'Welcome to my photography blog.',
    );
    expect(result.value.conversionFailed).toBe(false);
  });

  it('rewrites .photo-card divs back to {{< photo "g/s" >}} shortcodes', () => {
    const html = fixture('post-welcome.html');
    const result = parseBlogPost(
      html,
      'https://example.com/blog/welcome/',
    );
    expect(result.value.markdownBody).toContain(
      '{{< photo "sample/sample-01" >}}',
    );
    expect(result.value.markdownBody).not.toContain(
      '/photography/sample/sample-01/',
    );
    expect(result.value.markdownBody).not.toContain('photo-card');
  });

  it('preserves non-photo links', () => {
    const html = fixture('post-welcome.html');
    const result = parseBlogPost(
      html,
      'https://example.com/blog/welcome/',
    );
    expect(result.value.markdownBody).toContain('https://example.org');
  });
});
