import { describe, it, expect } from 'vitest';
import {
  identifyFromHtml,
  CURRENT_FALLBACK_THEME,
} from '../../src/recover/identify.js';

describe('identifyFromHtml', () => {
  it('reads theme and version when both data attrs are present', () => {
    const html =
      '<html><head><meta name="generator" content="Obscura 20260331-21:29:32" data-theme="editorial" data-version="0.2.1"></head></html>';
    const result = identifyFromHtml(html);
    expect(result.theme).toBe('editorial');
    expect(result.version).toBe('0.2.1');
    expect(result.buildTimestamp).toBe('20260331-21:29:32');
    expect(result.usedFallback).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('falls back to default theme when data-theme missing', () => {
    const html =
      '<html><head><meta name="generator" content="Obscura 20260101-12:00:00"></head></html>';
    const result = identifyFromHtml(html);
    expect(result.theme).toBe(CURRENT_FALLBACK_THEME);
    expect(result.version).toBeNull();
    expect(result.buildTimestamp).toBe('20260101-12:00:00');
    expect(result.usedFallback).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('partial fallback when only data-version missing', () => {
    const html =
      '<html><head><meta name="generator" content="Obscura 20260101-12:00:00" data-theme="custom"></head></html>';
    const result = identifyFromHtml(html);
    expect(result.theme).toBe('custom');
    expect(result.version).toBeNull();
    expect(result.usedFallback).toBe(true);
  });

  it('throws when generator meta is absent', () => {
    const html = '<html><head><title>not Obscura</title></head></html>';
    expect(() => identifyFromHtml(html)).toThrow(/not an Obscura site/iu);
  });

  it('throws when content does not start with "Obscura "', () => {
    const html =
      '<html><head><meta name="generator" content="Hugo 0.123"></head></html>';
    expect(() => identifyFromHtml(html)).toThrow(/not an Obscura site/iu);
  });
});
