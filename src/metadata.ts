import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { ExifData, PhotoMetadata } from './types.js';
import { sidecarPathForPhoto } from './sidecar.js';
import { readPhotoDate } from './photo-date.js';

interface RawSidecar {
  title?: string;
  date?: string | Date;
  camera?: string;
  lens?: string;
  focal_length?: number;
  iso?: number;
  aperture?: number;
  shutter_speed?: string;
  gps_lat?: number;
  gps_lon?: number;
  location?: string;
  caption?: string;
  photographer?: string;
  tags?: string[];
  license?: string;
}

function isSidecar(value: unknown): value is RawSidecar {
  return typeof value === 'object' && value !== null;
}

async function loadSidecar(photoPath: string): Promise<RawSidecar | undefined> {
  const sidecarPath = sidecarPathForPhoto(photoPath);
  try {
    const content = await readFile(sidecarPath, 'utf-8');
    const parsed: unknown = parseYaml(content);
    if (isSidecar(parsed)) {
      return parsed;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  return value;
}

export function mergeMetadata(
  exif: ExifData,
  sidecar: RawSidecar | undefined,
  defaultLicense: string = 'all-rights-reserved',
  defaultPhotographer: string = '',
): PhotoMetadata {
  const sidecarDate = readPhotoDate(sidecar?.date);
  const sidecarCamera = sidecar ? nonEmpty(sidecar.camera) : undefined;
  const sidecarLens = sidecar ? nonEmpty(sidecar.lens) : undefined;

  const result: {
    title: string;
    date?: Date;
    camera?: string;
    lens?: string;
    focal_length?: number;
    iso?: number;
    aperture?: number;
    shutter_speed?: string;
    gps_lat?: number;
    gps_lon?: number;
    location: string;
    caption: string;
    tags: readonly string[];
    license: string;
    photographer: string;
  } = {
    title: sidecar?.title ?? '',
    location: sidecar?.location ?? '',
    caption: sidecar?.caption ?? '',
    tags: sidecar?.tags ?? [],
    license: nonEmpty(sidecar?.license) ?? defaultLicense,
    photographer:
      nonEmpty(sidecar?.photographer) ??
      exif.photographer ??
      defaultPhotographer,
  };

  const date = sidecarDate ?? readPhotoDate(exif.date);
  const camera = sidecarCamera ?? exif.camera;
  const lens = sidecarLens ?? exif.lens;
  const focal_length = sidecar?.focal_length ?? exif.focal_length;
  const iso = sidecar?.iso ?? exif.iso;
  const aperture = sidecar?.aperture ?? exif.aperture;
  const shutter_speed = nonEmpty(sidecar?.shutter_speed) ?? exif.shutter_speed;
  const gps_lat = sidecar?.gps_lat ?? exif.gps_lat;
  const gps_lon = sidecar?.gps_lon ?? exif.gps_lon;

  if (date !== undefined) result.date = date;
  if (camera !== undefined) result.camera = camera;
  if (lens !== undefined) result.lens = lens;
  if (focal_length !== undefined) result.focal_length = focal_length;
  if (iso !== undefined) result.iso = iso;
  if (aperture !== undefined) result.aperture = aperture;
  if (shutter_speed !== undefined) result.shutter_speed = shutter_speed;
  if (gps_lat !== undefined) result.gps_lat = gps_lat;
  if (gps_lon !== undefined) result.gps_lon = gps_lon;

  return result;
}

export async function loadAndMergeMetadata(
  photoPath: string,
  exif: ExifData,
  defaultLicense: string = 'all-rights-reserved',
  defaultPhotographer: string = '',
): Promise<PhotoMetadata> {
  const sidecar = await loadSidecar(photoPath);
  return mergeMetadata(exif, sidecar, defaultLicense, defaultPhotographer);
}
