import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { formatExifWarnings, formatShutterSpeed, readExif } from '../src/exif.js';
import type { ExifWarning } from '../src/exif.js';

describe('formatExifWarnings', () => {
  it('returns empty string for no warnings', () => {
    expect(formatExifWarnings([])).toBe('');
  });

  it('formats a single warning', () => {
    const warnings: ExifWarning[] = [
      { filePath: '/photos/mono/rain.jpg', issues: ['no date', 'no lens info'] },
    ];
    const result = formatExifWarnings(warnings);
    expect(result).toContain('1 photo');
    expect(result).toContain('/photos/mono/rain.jpg');
    expect(result).toContain('no date, no lens info');
    expect(result).toContain('sidecar YAML');
  });

  it('formats multiple warnings with correct plural', () => {
    const warnings: ExifWarning[] = [
      { filePath: '/photos/a.jpg', issues: ['no date'] },
      { filePath: '/photos/b.jpg', issues: ['corrupt EXIF'] },
    ];
    const result = formatExifWarnings(warnings);
    expect(result).toContain('2 photos');
  });
});

describe('formatShutterSpeed', () => {
  it('formats fractional seconds as 1/N', () => {
    expect(formatShutterSpeed(1 / 250)).toBe('1/250');
    expect(formatShutterSpeed(1 / 125)).toBe('1/125');
    expect(formatShutterSpeed(1 / 60)).toBe('1/60');
    expect(formatShutterSpeed(1 / 1000)).toBe('1/1000');
  });

  it('formats whole seconds with s suffix', () => {
    expect(formatShutterSpeed(1)).toBe('1s');
    expect(formatShutterSpeed(2)).toBe('2s');
    expect(formatShutterSpeed(30)).toBe('30s');
  });

  it('rounds fractional denominators', () => {
    // 1/3 ≈ 0.333... should round to 1/3
    expect(formatShutterSpeed(0.333333)).toBe('1/3');
  });

  it('handles 1/2 second', () => {
    expect(formatShutterSpeed(0.5)).toBe('1/2');
  });
});

describe('readExif', () => {
  let dir: string;
  let withExifPath: string;
  let noExifPath: string;

  beforeAll(async () => {
    dir = await mkdtemp(resolve(tmpdir(), 'obscura-exif-'));
    withExifPath = resolve(dir, 'with-exif.jpg');
    noExifPath = resolve(dir, 'no-exif.jpg');

    const base = () =>
      sharp({
        create: { width: 8, height: 8, channels: 3, background: '#888888' },
      });

    await writeFile(
      withExifPath,
      await base()
        .withExif({
          IFD0: { Make: 'NIKON', Model: 'NIKON D850', Artist: 'Jens' },
          IFD2: {
            DateTimeOriginal: '2024:06:01 12:34:56',
            LensModel: '35mm f/1.8',
            ISOSpeedRatings: '400',
            FNumber: '2.8',
            FocalLength: '35',
            ExposureTime: '0.004',
          },
        })
        .jpeg()
        .toBuffer(),
    );
    await writeFile(noExifPath, await base().jpeg().toBuffer());
  }, 30_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // Regression: exifr's path-based reader is broken on current Node, which made
  // readExif report every photo as "corrupt EXIF" and silently drop all data.
  it('reads EXIF fields from a real file on disk', async () => {
    const result = await readExif(withExifPath);
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe('NIKON D850');
    expect(result.data.lens).toBe('35mm f/1.8');
    expect(result.data.iso).toBe(400);
    expect(result.data.aperture).toBe(2.8);
    expect(result.data.focal_length).toBe(35);
    expect(result.data.shutter_speed).toBe('1/250');
    expect(result.data.photographer).toBe('Jens');
    expect(result.data.date?.getUTCFullYear()).toBe(2024);
  });

  it('warns without throwing when a file has no EXIF', async () => {
    const result = await readExif(noExifPath);
    expect(result.data).toEqual({});
    expect(result.warning?.issues).toContain('no EXIF data');
  });

  it('warns without throwing when the file does not exist', async () => {
    const result = await readExif(resolve(dir, 'nope.jpg'));
    expect(result.data).toEqual({});
    expect(result.warning?.issues).toContain('corrupt EXIF');
  });
});
