import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePage } from '../../src/recover/parse-page.js';

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
});
