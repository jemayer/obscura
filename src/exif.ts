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

function buildExifData(parsed: ExifrOutput): ExifData {
  const date = parsed.DateTimeOriginal ?? parsed.CreateDate;
  const camera = buildCameraString(parsed.Make, parsed.Model);
  const lens = parsed.LensModel;
  const gps_lat = parsed.latitude;
  const gps_lon = parsed.longitude;

  const result: {
    date?: Date;
    camera?: string;
    lens?: string;
    gps_lat?: number;
    gps_lon?: number;
  } = {};

  if (date !== undefined) result.date = date;
  if (camera !== undefined) result.camera = camera;
  if (lens !== undefined) result.lens = lens;
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
