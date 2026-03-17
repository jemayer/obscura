import exifr from 'exifr';
import type { ExifData } from './types.js';

export interface ExifWarning {
  readonly filePath: string;
  readonly issues: readonly string[];
}

export interface ExifResultWithWarning {
  readonly data: ExifData;
  readonly warning: ExifWarning;
}

export interface ExifResultClean {
  readonly data: ExifData;
  readonly warning?: undefined;
}

export type ExifResult = ExifResultWithWarning | ExifResultClean;

interface ExifrOutput {
  DateTimeOriginal?: Date;
  CreateDate?: Date;
  Make?: string;
  Model?: string;
  LensModel?: string;
  LensMake?: string;
  ISO?: number;
  FNumber?: number;
  FocalLength?: number;
  ExposureTime?: number;
  latitude?: number;
  longitude?: number;
}

const EXIF_PICK_FIELDS = [
  'DateTimeOriginal',
  'CreateDate',
  'Make',
  'Model',
  'LensModel',
  'LensMake',
  'ISO',
  'FNumber',
  'FocalLength',
  'ExposureTime',
  'latitude',
  'longitude',
];

function buildCameraString(
  make: string | undefined,
  model: string | undefined,
): string | undefined {
  if (!model) return undefined;
  // Many cameras include the make in the model string (e.g. "NIKON D850")
  if (make && !model.toUpperCase().startsWith(make.toUpperCase())) {
    return `${make} ${model}`;
  }
  return model;
}

export function formatShutterSpeed(seconds: number): string {
  if (seconds >= 1) {
    return `${String(seconds)}s`;
  }
  const denominator = Math.round(1 / seconds);
  return `1/${String(denominator)}`;
}

/** Treat Unix epoch (1 Jan 1970) as missing — it's almost always a EXIF default, not a real date. */
function isEpochDate(date: Date): boolean {
  return (
    date.getFullYear() === 1970 && date.getMonth() === 0 && date.getDate() === 1
  );
}

function buildExifData(parsed: ExifrOutput): ExifData {
  const rawDate = parsed.DateTimeOriginal ?? parsed.CreateDate;
  const date =
    rawDate !== undefined && !isEpochDate(rawDate) ? rawDate : undefined;
  const camera = buildCameraString(parsed.Make, parsed.Model);
  const lens = parsed.LensModel;
  const focal_length =
    parsed.FocalLength !== undefined
      ? Math.round(parsed.FocalLength * 100) / 100
      : undefined;
  const iso = parsed.ISO;
  const aperture =
    parsed.FNumber !== undefined
      ? Math.round(parsed.FNumber * 100) / 100
      : undefined;
  const shutter_speed =
    parsed.ExposureTime !== undefined
      ? formatShutterSpeed(parsed.ExposureTime)
      : undefined;
  const gps_lat = parsed.latitude;
  const gps_lon = parsed.longitude;

  const result: {
    date?: Date;
    camera?: string;
    lens?: string;
    focal_length?: number;
    iso?: number;
    aperture?: number;
    shutter_speed?: string;
    gps_lat?: number;
    gps_lon?: number;
  } = {};

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

function collectIssues(parsed: ExifrOutput): string[] {
  const issues: string[] = [];
  if (!parsed.DateTimeOriginal && !parsed.CreateDate) issues.push('no date');
  if (!parsed.Model) issues.push('no camera info');
  if (!parsed.LensModel) issues.push('no lens info');
  return issues;
}

export async function readExif(filePath: string): Promise<ExifResult> {
  let parsed: ExifrOutput | null | undefined;

  try {
    parsed = (await exifr.parse(filePath, {
      pick: EXIF_PICK_FIELDS,
      gps: true,
    })) as ExifrOutput | null | undefined;
  } catch {
    return {
      data: {},
      warning: { filePath, issues: ['corrupt EXIF'] },
    };
  }

  if (!parsed) {
    return {
      data: {},
      warning: { filePath, issues: ['no EXIF data'] },
    };
  }

  const data = buildExifData(parsed);
  const issues = collectIssues(parsed);

  if (issues.length > 0) {
    return { data, warning: { filePath, issues } };
  }

  return { data };
}

export function formatExifWarnings(warnings: readonly ExifWarning[]): string {
  if (warnings.length === 0) return '';

  const lines = [
    `\u26A0 Missing or corrupt EXIF data in ${String(warnings.length)} photo${warnings.length === 1 ? '' : 's'}:`,
  ];

  for (const w of warnings) {
    lines.push(`  - ${w.filePath} (${w.issues.join(', ')})`);
  }

  lines.push(
    '  Tip: fill in the missing fields in the corresponding sidecar YAML files.',
  );

  return lines.join('\n');
}
