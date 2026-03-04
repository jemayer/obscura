import { describe, it, expect } from 'vitest';
import { mergeMetadata } from '../src/metadata.js';
import type { ExifData } from '../src/types.js';

describe('mergeMetadata', () => {
  const baseExif: ExifData = {
    date: new Date('2024-06-15'),
    camera: 'Canon EOS R5',
    lens: 'RF 50mm f/1.2L',
    gps_lat: 52.52,
    gps_lon: 13.405,
  };

  it('returns EXIF data when no sidecar is provided', () => {
    const result = mergeMetadata(baseExif, undefined);
    expect(result.date).toEqual(baseExif.date);
    expect(result.camera).toBe('Canon EOS R5');
    expect(result.lens).toBe('RF 50mm f/1.2L');
    expect(result.gps_lat).toBe(52.52);
    expect(result.title).toBe('');
    expect(result.location).toBe('');
    expect(result.caption).toBe('');
    expect(result.tags).toEqual([]);
  });

  it('uses sidecar values when no EXIF is available', () => {
    const emptyExif: ExifData = {};
    const sidecar = {
      title: 'Berlin Sunset',
      date: '2024-07-01',
      camera: 'Leica M10',
      lens: 'Summilux 35mm',
      location: 'Berlin, Germany',
      caption: 'A beautiful sunset',
      tags: ['sunset', 'berlin'],
    };
    const result = mergeMetadata(emptyExif, sidecar);
    expect(result.title).toBe('Berlin Sunset');
    expect(result.camera).toBe('Leica M10');
    expect(result.lens).toBe('Summilux 35mm');
    expect(result.location).toBe('Berlin, Germany');
    expect(result.caption).toBe('A beautiful sunset');
    expect(result.tags).toEqual(['sunset', 'berlin']);
    expect(result.date).toEqual(new Date('2024-07-01'));
  });

  it('sidecar wins on conflict', () => {
    const sidecar = {
      title: 'Overridden Title',
      camera: 'Leica M10',
      date: '2025-01-01',
    };
    const result = mergeMetadata(baseExif, sidecar);
    expect(result.camera).toBe('Leica M10');
    expect(result.date).toEqual(new Date('2025-01-01'));
    // EXIF lens should still be present (no sidecar override)
    expect(result.lens).toBe('RF 50mm f/1.2L');
  });

  it('empty sidecar fields do not override EXIF values', () => {
    const sidecar = {
      title: 'Photo',
      camera: '',  // empty string should not override
      lens: '',
    };
    const result = mergeMetadata(baseExif, sidecar);
    // nonEmpty('') returns undefined, so EXIF camera should win
    expect(result.camera).toBe('Canon EOS R5');
    expect(result.lens).toBe('RF 50mm f/1.2L');
  });

  it('handles GPS from sidecar overriding EXIF', () => {
    const sidecar = {
      title: 'Photo',
      gps_lat: 48.856,
      gps_lon: 2.352,
    };
    const result = mergeMetadata(baseExif, sidecar);
    expect(result.gps_lat).toBe(48.856);
    expect(result.gps_lon).toBe(2.352);
  });

  it('treats Unix epoch date (1 Jan 1970) from EXIF as missing', () => {
    const epochExif: ExifData = {
      date: new Date('1970-01-01T00:00:00.000Z'),
      camera: 'Canon EOS R5',
    };
    const result = mergeMetadata(epochExif, undefined);
    expect(result.date).toBeUndefined();
    expect(result.camera).toBe('Canon EOS R5');
  });

  it('treats Unix epoch date (1 Jan 1970) from sidecar as missing', () => {
    const emptyExif: ExifData = {};
    const sidecar = {
      title: 'Photo',
      date: '1970-01-01',
    };
    const result = mergeMetadata(emptyExif, sidecar);
    expect(result.date).toBeUndefined();
  });

  it('treats Unix epoch Date object from sidecar as missing', () => {
    const emptyExif: ExifData = {};
    const sidecar = {
      title: 'Photo',
      date: new Date('1970-01-01T00:00:00.000Z'),
    };
    const result = mergeMetadata(emptyExif, sidecar);
    expect(result.date).toBeUndefined();
  });

  it('does not filter non-epoch dates from 1970', () => {
    const exif: ExifData = {
      date: new Date('1970-06-15'),
    };
    const result = mergeMetadata(exif, undefined);
    expect(result.date).toEqual(new Date('1970-06-15'));
  });

  it('passes through focal_length, ISO, aperture, and shutter_speed from EXIF', () => {
    const exif: ExifData = {
      focal_length: 50,
      iso: 400,
      aperture: 2.8,
      shutter_speed: '1/250',
    };
    const result = mergeMetadata(exif, undefined);
    expect(result.focal_length).toBe(50);
    expect(result.iso).toBe(400);
    expect(result.aperture).toBe(2.8);
    expect(result.shutter_speed).toBe('1/250');
  });

  it('sidecar overrides focal_length, ISO, aperture, and shutter_speed', () => {
    const exif: ExifData = {
      focal_length: 50,
      iso: 400,
      aperture: 2.8,
      shutter_speed: '1/250',
    };
    const sidecar = {
      title: 'Photo',
      focal_length: 85,
      iso: 800,
      aperture: 4,
      shutter_speed: '1/500',
    };
    const result = mergeMetadata(exif, sidecar);
    expect(result.focal_length).toBe(85);
    expect(result.iso).toBe(800);
    expect(result.aperture).toBe(4);
    expect(result.shutter_speed).toBe('1/500');
  });

  it('empty shutter_speed in sidecar does not override EXIF', () => {
    const exif: ExifData = {
      shutter_speed: '1/250',
    };
    const sidecar = {
      title: 'Photo',
      shutter_speed: '',
    };
    const result = mergeMetadata(exif, sidecar);
    expect(result.shutter_speed).toBe('1/250');
  });
});
