import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseHomepage } from '../../src/recover/parse-site.js';

const fixture = (name: string): string =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parseHomepage', () => {
  it('extracts full site config from a rich homepage', () => {
    const html = fixture('homepage-full.html');
    const result = parseHomepage(html, 'editorial');
    expect(result.value.title).toBe('My Portfolio');
    expect(result.value.subtitle).toBe('Landscapes & Portraits');
    expect(result.value.description).toBe(
      'A portfolio of landscape and portrait photography.',
    );
    expect(result.value.base_url).toBe('https://example.com');
    expect(result.value.theme).toBe('editorial');
    expect(result.value.default_photographer).toBe('Jane Roe');
    expect(result.value.social_links).toEqual([
      { platform: 'bluesky', url: 'https://bsky.app/profile/jane' },
      { platform: 'github', url: 'https://github.com/jane' },
    ]);
    expect(result.value.images?.breakpoints).toEqual([400, 800, 1200, 2400]);
  });

  it('extracts hero_image from a homepage with a hero section', () => {
    const html = fixture('homepage-full.html');
    const result = parseHomepage(html, 'editorial');
    expect(result.value.hero_image).toBe('sample/sample-01');
  });

  it('omits hero_image when no hero section is present', () => {
    const html = fixture('homepage-bare.html');
    const result = parseHomepage(html, 'editorial');
    expect(result.value.hero_image).toBeUndefined();
  });

  it('returns minimal config from a bare homepage without warnings beyond optionals', () => {
    const html = fixture('homepage-bare.html');
    const result = parseHomepage(html, 'editorial');
    expect(result.value.title).toBe('Plain Site');
    expect(result.value.base_url).toBe('https://plain.example');
    expect(result.value.subtitle).toBeUndefined();
    expect(result.value.description).toBeUndefined();
    expect(result.value.social_links).toEqual([]);
  });
});
