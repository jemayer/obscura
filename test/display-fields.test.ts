import { describe, it, expect } from 'vitest';
import { parseDisplayFields } from '../src/config.js';
import { ALL_DISPLAY_FIELDS, EXIF_SUB_FIELDS } from '../src/types.js';

describe('parseDisplayFields', () => {
  it('returns all fields when undefined', () => {
    expect(parseDisplayFields(undefined)).toEqual(ALL_DISPLAY_FIELDS);
  });

  it('returns all fields when given an empty array', () => {
    expect(parseDisplayFields([])).toEqual(ALL_DISPLAY_FIELDS);
  });

  it('returns only recognised fields', () => {
    expect(parseDisplayFields(['date', 'license'])).toEqual([
      'date',
      'license',
    ]);
  });

  it('filters out unknown field names', () => {
    expect(parseDisplayFields(['camera', 'bogus', 'tags'])).toEqual([
      'camera',
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
      parseDisplayFields(['date', 'camera', 'lens', 'settings', 'location', 'tags', 'photographer', 'license']),
    ).toEqual(['date', 'camera', 'lens', 'settings', 'location', 'tags', 'photographer', 'license']);
  });

  it('recognises photographer as a valid field', () => {
    expect(parseDisplayFields(['photographer', 'license'])).toEqual([
      'photographer',
      'license',
    ]);
  });

  it('expands "exif" alias to date, camera, lens, settings', () => {
    expect(parseDisplayFields(['exif'])).toEqual([...EXIF_SUB_FIELDS]);
  });

  it('expands "exif" alongside other fields', () => {
    expect(parseDisplayFields(['exif', 'location'])).toEqual([
      'date',
      'camera',
      'lens',
      'settings',
      'location',
    ]);
  });

  it('deduplicates when exif alias overlaps with explicit sub-fields', () => {
    expect(parseDisplayFields(['date', 'exif', 'location'])).toEqual([
      'date',
      'camera',
      'lens',
      'settings',
      'location',
    ]);
  });

  it('preserves order: explicit fields before exif expansion', () => {
    expect(parseDisplayFields(['location', 'exif'])).toEqual([
      'location',
      'date',
      'camera',
      'lens',
      'settings',
    ]);
  });
});
