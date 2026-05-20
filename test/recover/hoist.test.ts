import { describe, it, expect } from 'vitest';
import { hoistCommonFields } from '../../src/recover/hoist.js';
import type { PhotoMetadata } from '../../src/types.js';

describe('hoistCommonFields', () => {
  it('hoists license when every photo has the same value', () => {
    const result = hoistCommonFields([
      { title: 'A', license: 'all-rights-reserved' },
      { title: 'B', license: 'all-rights-reserved' },
    ]);
    expect(result.siteLicense).toBe('all-rights-reserved');
    expect(result.strippedMetadata[0]?.license).toBeUndefined();
    expect(result.strippedMetadata[1]?.license).toBeUndefined();
    expect(result.strippedMetadata[0]?.title).toBe('A');
  });

  it('does not hoist when licenses differ; outlier keeps the per-sidecar value', () => {
    const result = hoistCommonFields([
      { title: 'A', license: 'CC-BY-4.0' },
      { title: 'B', license: 'CC-BY-4.0' },
      { title: 'C', license: 'all-rights-reserved' },
    ]);
    expect(result.siteLicense).toBeUndefined();
    expect(result.strippedMetadata[0]?.license).toBe('CC-BY-4.0');
    expect(result.strippedMetadata[2]?.license).toBe('all-rights-reserved');
  });

  it('does not hoist when at least one photo is missing the field', () => {
    const result = hoistCommonFields([
      { title: 'A', license: 'CC-BY-4.0' },
      { title: 'B' },
    ]);
    expect(result.siteLicense).toBeUndefined();
    expect(result.strippedMetadata[0]?.license).toBe('CC-BY-4.0');
  });

  it('hoists photographer similarly', () => {
    const result = hoistCommonFields([
      { title: 'A', photographer: 'Jane Roe' },
      { title: 'B', photographer: 'Jane Roe' },
    ]);
    expect(result.defaultPhotographer).toBe('Jane Roe');
    expect(result.strippedMetadata[0]?.photographer).toBeUndefined();
  });

  it('handles an empty list', () => {
    const result = hoistCommonFields([]);
    expect(result.siteLicense).toBeUndefined();
    expect(result.defaultPhotographer).toBeUndefined();
    expect(result.strippedMetadata).toEqual([]);
  });

  it('preserves all other fields untouched', () => {
    const input: Partial<PhotoMetadata> = {
      title: 'A',
      caption: 'cap',
      tags: ['x'],
      camera: 'Leica',
      license: 'all-rights-reserved',
      photographer: 'Jane',
    };
    const result = hoistCommonFields([input]);
    expect(result.strippedMetadata[0]).toEqual({
      title: 'A',
      caption: 'cap',
      tags: ['x'],
      camera: 'Leica',
    });
  });
});
