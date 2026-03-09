import { describe, it, expect } from 'vitest';
import { parseDisplayFields } from '../src/config.js';
import { ALL_DISPLAY_FIELDS } from '../src/types.js';

describe('parseDisplayFields', () => {
  it('returns all fields when undefined', () => {
    expect(parseDisplayFields(undefined)).toEqual(ALL_DISPLAY_FIELDS);
  });

  it('returns all fields when given an empty array', () => {
    expect(parseDisplayFields([])).toEqual(ALL_DISPLAY_FIELDS);
  });

  it('returns only recognised fields', () => {
    expect(parseDisplayFields(['exif', 'license'])).toEqual([
      'exif',
      'license',
    ]);
  });

  it('filters out unknown field names', () => {
    expect(parseDisplayFields(['exif', 'bogus', 'tags'])).toEqual([
      'exif',
      'tags',
    ]);
  });

  it('returns all fields when all entries are invalid', () => {
    expect(parseDisplayFields(['nope', 'invalid'])).toEqual(ALL_DISPLAY_FIELDS);
  });

  it('accepts a single field', () => {
    expect(parseDisplayFields(['license'])).toEqual(['license']);
  });

  it('accepts all valid fields', () => {
    expect(
      parseDisplayFields(['exif', 'location', 'tags', 'license']),
    ).toEqual(['exif', 'location', 'tags', 'license']);
  });
});
