import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseImageConfig } from '../src/config.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseImageConfig', () => {
  it('defaults max_dimension to 2400 when the images block is absent', () => {
    expect(parseImageConfig(undefined)).toEqual({
      breakpoints: [400, 800, 1200, 2400],
      webp_quality: 85,
      max_dimension: 2400,
    });
  });

  it('defaults max_dimension to 2400 when only the key is missing', () => {
    const config = parseImageConfig({ breakpoints: [500], webp_quality: 70 });
    expect(config.max_dimension).toBe(2400);
    expect(config.breakpoints).toEqual([500]);
    expect(config.webp_quality).toBe(70);
  });

  it('accepts an explicit max_dimension', () => {
    expect(parseImageConfig({ max_dimension: 1600 }).max_dimension).toBe(1600);
  });

  it('rejects a non-positive max_dimension', () => {
    expect(() => parseImageConfig({ max_dimension: 0 })).toThrow(
      /max_dimension/,
    );
    expect(() => parseImageConfig({ max_dimension: -100 })).toThrow(
      /max_dimension/,
    );
  });

  it('rejects a non-integer max_dimension', () => {
    expect(() => parseImageConfig({ max_dimension: 1600.5 })).toThrow(
      /max_dimension/,
    );
  });

  it('warns when max_dimension is below the smallest breakpoint', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const config = parseImageConfig({
      breakpoints: [400, 800],
      max_dimension: 300,
    });
    expect(config.max_dimension).toBe(300);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('max_dimension'),
    );
  });

  it('does not warn when max_dimension covers the smallest breakpoint', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    parseImageConfig({ breakpoints: [400, 800], max_dimension: 400 });
    expect(warn).not.toHaveBeenCalled();
  });
});
