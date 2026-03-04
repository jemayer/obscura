import { describe, it, expect } from 'vitest';
import { formatExifWarnings, formatShutterSpeed } from '../src/exif.js';
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
