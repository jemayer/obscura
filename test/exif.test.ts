import { describe, it, expect } from 'vitest';
import { formatExifWarnings } from '../src/exif.js';
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
