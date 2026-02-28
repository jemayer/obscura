import { describe, it, expect } from 'vitest';
import { slugifyFilename, namespacedSlug, SlugIndex } from '../src/slugs.js';

describe('slugifyFilename', () => {
  it('lowercases and strips extension', () => {
    expect(slugifyFilename('Berlin_Sunset.jpg')).toBe('berlin-sunset');
  });

  it('replaces spaces and underscores with hyphens', () => {
    expect(slugifyFilename('my photo_name.png')).toBe('my-photo-name');
  });

  it('strips special characters', () => {
    expect(slugifyFilename('café & crème (2024).webp')).toBe('caf-crme-2024');
  });

  it('collapses multiple hyphens', () => {
    expect(slugifyFilename('foo---bar.jpg')).toBe('foo-bar');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugifyFilename('-hello-.jpg')).toBe('hello');
  });

  it('handles filename without extension', () => {
    expect(slugifyFilename('simple')).toBe('simple');
  });

  it('handles path with directories', () => {
    expect(slugifyFilename('/photos/gallery/IMG_1234.CR2')).toBe('img-1234');
  });
});

describe('namespacedSlug', () => {
  it('combines gallery slug and filename slug', () => {
    expect(namespacedSlug('mono', 'Rain_Drop.jpg')).toBe('mono/rain-drop');
  });
});

describe('SlugIndex', () => {
  it('registers and resolves full namespaced slugs', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');
    expect(index.resolve('mono/rain')).toBe('mono/rain');
  });

  it('resolves bare slugs when unambiguous', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');
    expect(index.resolve('rain')).toBe('mono/rain');
  });

  it('throws on non-existent full slug', () => {
    const index = new SlugIndex();
    expect(() => index.resolve('mono/nope')).toThrow('Photo not found: "mono/nope"');
  });

  it('throws on non-existent bare slug', () => {
    const index = new SlugIndex();
    expect(() => index.resolve('nope')).toThrow('Photo not found: "nope"');
  });

  it('throws on ambiguous bare slug', () => {
    const index = new SlugIndex();
    index.register('mono', 'sunset.jpg', '/photos/mono/sunset.jpg');
    index.register('color', 'sunset.jpg', '/photos/color/sunset.jpg');
    expect(() => index.resolve('sunset')).toThrow('Ambiguous photo slug "sunset"');
  });

  it('throws on duplicate full slug', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');
    expect(() => index.register('mono', 'rain.jpg', '/photos/mono/rain2.jpg')).toThrow(
      'Duplicate photo slug "mono/rain"',
    );
  });

  it('tracks size correctly', () => {
    const index = new SlugIndex();
    expect(index.size).toBe(0);
    index.register('mono', 'a.jpg', '/a.jpg');
    index.register('mono', 'b.jpg', '/b.jpg');
    expect(index.size).toBe(2);
  });

  it('has() returns correct results', () => {
    const index = new SlugIndex();
    index.register('mono', 'rain.jpg', '/photos/mono/rain.jpg');
    expect(index.has('mono/rain')).toBe(true);
    expect(index.has('mono/nope')).toBe(false);
  });
});
