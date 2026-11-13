/**
 * Universal photo metadata extraction pipeline.
 *
 * Uses a two-stage strategy to extract EXIF, XMP, and IPTC metadata across
 * JPEG, TIFF, PNG, WebP, HEIC, and AVIF containers:
 * 1. Direct container & multi-segment parsing via `exifr.parse(buffer)`.
 * 2. Universal container demuxing via `sharp(buffer).metadata()` (libvips),
 *    which extracts raw `exif`, `xmp`, and `iptc` byte buffers from formats
 *    `exifr` does not natively demux (such as WebP), strips the optional
 *    6-byte `Exif\0\0` APP1 header, and feeds the raw TIFF/XMP/IPTC payload
 *    back into `exifr`.
 */
import exifr from "exifr";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { ExifData } from "./types.js";

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

interface RawExifOutput {
  // Date fields (EXIF, XMP, IPTC, and numeric IFD0 tag 36867/36868 from darktable/Exiv2)
  DateTimeOriginal?: unknown;
  CreateDate?: unknown;
  DateCreated?: unknown;
  DigitalCreationDate?: unknown;
  "36867"?: unknown;
  "36868"?: unknown;

  // Camera fields
  Make?: unknown;
  Model?: unknown;
  UniqueCameraModel?: unknown;
  LocalizedCameraModel?: unknown;

  // Lens fields
  LensModel?: unknown;
  Lens?: unknown;
  LensMake?: unknown;
  LensInfo?: unknown;
  DNGLensInfo?: unknown;

  // Exposure settings
  ISO?: unknown;
  ISOSpeedRatings?: unknown;
  RecommendedExposureIndex?: unknown;
  StandardOutputSensitivity?: unknown;
  ISOSpeed?: unknown;
  ExposureIndex?: unknown;
  FNumber?: unknown;
  ApertureValue?: unknown;
  FocalLength?: unknown;
  FocalLengthIn35mmFormat?: unknown;
  ExposureTime?: unknown;
  ShutterSpeedValue?: unknown;

  // GPS
  latitude?: unknown;
  longitude?: unknown;
  GPSLatitude?: unknown;
  GPSLatitudeRef?: unknown;
  GPSLongitude?: unknown;
  GPSLongitudeRef?: unknown;

  // Photographer / Author (EXIF Artist, Canon OwnerName, Windows XPAuthor, XMP dc:creator, IPTC Byline)
  Artist?: unknown;
  OwnerName?: unknown;
  CameraOwnerName?: unknown;
  XPAuthor?: unknown;
  creator?: unknown;
  Byline?: unknown;
}

/**
 * Placeholder lens strings recorded by cameras or RAW processors when no
 * electronic lens is attached (e.g. body-only or manual lens without contacts).
 */
const INVALID_LENS_PATTERN =
  /^(0+(\.0+)?(\s*mm)?(\s*f\/0+(\.0+)?)?|65535(\.0+)?(\s*mm)?|-+|unknown|none|n\/a|manual(\s+lens)?)$/i;

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.replace(/\0+$/g, "").trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const str = asNonEmptyString(item);
      if (str !== undefined) return str;
    }
  }
  return undefined;
}

function firstString(...values: readonly unknown[]): string | undefined {
  for (const val of values) {
    const str = asNonEmptyString(val);
    if (str !== undefined) return str;
  }
  return undefined;
}

/**
 * Coerces a raw EXIF/XMP value into a finite number. Handles numbers, XMP
 * rational strings (e.g. `"240/10"`, `"1/400"`), strings with `"mm"` suffixes,
 * `Uint16Array`/`Uint32Array` views, and single-element arrays.
 */
function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const rationalMatch = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(
      trimmed,
    );
    if (rationalMatch) {
      const num = Number(rationalMatch[1]);
      const den = Number(rationalMatch[2]);
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return num / den;
      }
      return undefined;
    }
    const parsed = Number(trimmed.replace(/\s*mm$/i, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (ArrayBuffer.isView(value)) {
    const arr = value as unknown as ArrayLike<number>;
    if (arr.length > 0) {
      const first = arr[0];
      return typeof first === "number" && Number.isFinite(first)
        ? first
        : undefined;
    }
  }
  if (Array.isArray(value) && value.length > 0) {
    return parseNumericValue(value[0]);
  }
  return undefined;
}

function firstPositiveNumber(
  ...values: readonly unknown[]
): number | undefined {
  for (const val of values) {
    const num = parseNumericValue(val);
    if (num !== undefined && num > 0) return num;
  }
  return undefined;
}

/**
 * Strips legal/corporate suffixes from an EXIF `Make` string so brand comparisons
 * and display strings stay clean (e.g. `"NIKON CORPORATION"` -> `"NIKON"`,
 * `"RICOH IMAGING COMPANY, LTD."` -> `"RICOH"`, `"LEICA CAMERA AG"` -> `"LEICA"`).
 */
function cleanManufacturerName(make: string): string {
  const cleaned = make
    .replace(
      /\s*,?\s*\b(imaging\s+company|imaging\s+corp\.?|camera\s+ag|optical\s+co\.?|digital\s+solutions|corporation|corp\.?|company|co\.?|inc\.?|ltd\.?|gmbh|ag)\b[\s.,]*/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : make.trim();
}

/**
 * Combines EXIF `Make` and `Model` into a clean display name without redundant
 * brand prefixes or corporate entity suffixes:
 * - `("NIKON CORPORATION", "NIKON D850")` -> `"NIKON D850"`
 * - `("RICOH IMAGING COMPANY, LTD.", "PENTAX KP")` -> `"PENTAX KP"`
 * - `("OLYMPUS CORPORATION", "E-M1MarkII")` -> `"OLYMPUS E-M1MarkII"`
 */
export function buildCameraString(
  make: string | undefined,
  model: string | undefined,
): string | undefined {
  if (!model) return undefined;
  const trimmedModel = model.trim();
  if (!make) return trimmedModel;

  const cleanMake = cleanManufacturerName(make);
  const upperModel = trimmedModel.toUpperCase();
  const upperMake = cleanMake.toUpperCase();

  // Many cameras include the brand in the model string (e.g. "NIKON D850", "Canon EOS 6D", "LEICA Q2", "RICOH GR III")
  if (
    upperModel.startsWith(upperMake) ||
    (upperMake === "RICOH" && upperModel.startsWith("PENTAX"))
  ) {
    return trimmedModel;
  }
  return `${cleanMake} ${trimmedModel}`;
}

/**
 * Formats a 4-element EXIF `LensInfo` / `DNGLensInfo` rational tuple
 * `[minFocal, maxFocal, minFNumber, maxFNumber]` into a human-readable string
 * such as `"24-70mm f/2.8"` or `"50mm f/1.4"` when `LensModel` is absent.
 */
function formatLensInfo(value: unknown): string | undefined {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return undefined;
  const arr = Array.from(value as ArrayLike<unknown>).map((v) =>
    parseNumericValue(v),
  );
  const minFl = arr[0];
  const maxFl = arr[1];
  const minF = arr[2];
  const maxF = arr[3];
  if (minFl === undefined || minFl <= 0 || minFl >= 65535) return undefined;

  const flPart =
    maxFl !== undefined && maxFl > 0 && maxFl !== minFl
      ? `${String(minFl)}-${String(maxFl)}mm`
      : `${String(minFl)}mm`;

  if (minF !== undefined && minF > 0 && minF < 100) {
    const fPart =
      maxF !== undefined && maxF > 0 && maxF !== minF
        ? ` f/${String(minF)}-${String(maxF)}`
        : ` f/${String(minF)}`;
    return `${flPart}${fPart}`;
  }
  return flPart;
}

function extractLens(parsed: RawExifOutput): string | undefined {
  const candidates = [parsed.LensModel, parsed.Lens];
  for (const candidate of candidates) {
    const str = asNonEmptyString(candidate);
    if (str !== undefined && !INVALID_LENS_PATTERN.test(str)) {
      return str;
    }
  }
  return formatLensInfo(parsed.LensInfo ?? parsed.DNGLensInfo);
}

export function formatShutterSpeed(seconds: number): string {
  if (seconds >= 1) {
    return `${String(Math.round(seconds * 10) / 10)}s`;
  }
  const denominator = Math.round(1 / seconds);
  return `1/${String(denominator)}`;
}

/** Treat Unix epoch (1 Jan 1970) as missing — it's almost always an EXIF default, not a real date. */
function isEpochDate(date: Date): boolean {
  const isUtcEpoch =
    date.getUTCFullYear() === 1970 &&
    date.getUTCMonth() === 0 &&
    date.getUTCDate() === 1;
  const isLocalEpoch =
    date.getFullYear() === 1970 &&
    date.getMonth() === 0 &&
    date.getDate() === 1;
  return isUtcEpoch || isLocalEpoch;
}

function parseExifDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime()) || isEpochDate(value)) return undefined;
    // exifr constructs Date objects using local timezone getters (new Date(y, m-1, d, h, min, s)).
    // Re-anchoring those wall-clock components in UTC prevents date.toISOString().split('T')[0]
    // from shifting evening photos to the next calendar day in negative UTC offsets.
    const utcDate = new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
      ),
    );
    return isEpochDate(utcDate) ? undefined : utcDate;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.startsWith("0000")) return undefined;

    // Match EXIF "YYYY:MM:DD HH:MM:SS" or ISO "YYYY-MM-DD..."
    const match =
      /^(\d{4})[:/-](\d{2})[:/-](\d{2})(?:[T\s](\d{2}):(\d{2}):(\d{2}))?/.exec(
        trimmed,
      );
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const hour = match[4] !== undefined ? Number(match[4]) : 0;
      const minute = match[5] !== undefined ? Number(match[5]) : 0;
      const second = match[6] !== undefined ? Number(match[6]) : 0;
      const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      if (!Number.isNaN(d.getTime()) && !isEpochDate(d)) {
        return d;
      }
    }

    const fallback = new Date(trimmed);
    if (!Number.isNaN(fallback.getTime()) && !isEpochDate(fallback)) {
      return fallback;
    }
  }

  return undefined;
}

function firstValidDate(...values: readonly unknown[]): Date | undefined {
  for (const val of values) {
    const d = parseExifDate(val);
    if (d !== undefined) return d;
  }
  return undefined;
}

function extractGpsCoordinate(
  direct: unknown,
  dmsValue: unknown,
  refValue: unknown,
  maxAbs: number,
): number | undefined {
  const directNum = parseNumericValue(direct);
  if (directNum !== undefined && Math.abs(directNum) <= maxAbs) {
    return directNum;
  }

  const ref = asNonEmptyString(refValue)?.toUpperCase();
  if (Array.isArray(dmsValue) && dmsValue.length >= 2) {
    const deg = parseNumericValue(dmsValue[0]) ?? 0;
    const min = parseNumericValue(dmsValue[1]) ?? 0;
    const sec = parseNumericValue(dmsValue[2]) ?? 0;
    let coord = deg + min / 60 + sec / 3600;
    if (ref === "S" || ref === "W") coord *= -1;
    if (Number.isFinite(coord) && Math.abs(coord) <= maxAbs) return coord;
  }

  if (typeof dmsValue === "string") {
    // XMP GPS format e.g. "52,31.2N" or "52, 31, 12N"
    const xmpMatch =
      /^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*([NSEW])?$/i.exec(
        dmsValue.trim(),
      );
    if (xmpMatch) {
      const deg = Number(xmpMatch[1]);
      const min = Number(xmpMatch[2]);
      const sec = xmpMatch[3] !== undefined ? Number(xmpMatch[3]) : 0;
      const dir = (xmpMatch[4] ?? ref ?? "").toUpperCase();
      let coord = deg + min / 60 + sec / 3600;
      if (dir === "S" || dir === "W") coord *= -1;
      if (Number.isFinite(coord) && Math.abs(coord) <= maxAbs) return coord;
    }
  }

  return undefined;
}

function extractAperture(parsed: RawExifOutput): number | undefined {
  const fNumber = firstPositiveNumber(parsed.FNumber);
  if (fNumber !== undefined && fNumber < 256) {
    return Math.round(fNumber * 100) / 100;
  }
  // APEX ApertureValue fallback: f-number = 2^(Av / 2)
  const apexAv = parseNumericValue(parsed.ApertureValue);
  if (apexAv !== undefined && apexAv > -10 && apexAv < 16) {
    const computed = Math.pow(2, apexAv / 2);
    return Math.round(computed * 10) / 10;
  }
  return undefined;
}

function extractShutterSpeed(parsed: RawExifOutput): string | undefined {
  const exposureTime = firstPositiveNumber(parsed.ExposureTime);
  if (exposureTime !== undefined) {
    return formatShutterSpeed(exposureTime);
  }
  // APEX ShutterSpeedValue fallback: exposure time = 2^(-Tv)
  const apexTv = parseNumericValue(parsed.ShutterSpeedValue);
  if (apexTv !== undefined && apexTv > -20 && apexTv < 20) {
    return formatShutterSpeed(Math.pow(2, -apexTv));
  }
  return undefined;
}

/**
 * Normalizes raw EXIF/XMP/IPTC tags into Obscura's `ExifData` structure using
 * multi-standard fallback chains:
 * - `date`: numeric IFD0 string `36867` -> `DateTimeOriginal` -> `36868` -> `CreateDate` -> `DateCreated` -> `DigitalCreationDate`
 * - `camera`: `Make` + (`Model` -> `UniqueCameraModel` -> `LocalizedCameraModel`)
 * - `lens`: `LensModel` -> `Lens` (0xFDEA / XMP `aux:Lens`) -> formatted `LensInfo` / `DNGLensInfo`
 * - `iso`: `ISO` -> `ISOSpeedRatings` -> CIPA DC-008 `RecommendedExposureIndex` / `StandardOutputSensitivity` / `ISOSpeed` / `ExposureIndex`
 * - `aperture`: `FNumber` -> APEX `ApertureValue` (2^(Av/2))
 * - `shutter_speed`: `ExposureTime` -> APEX `ShutterSpeedValue` (2^(-Tv))
 * - `photographer`: `Artist` -> Canon `OwnerName` (0xA430) / `CameraOwnerName` -> `XPAuthor` -> XMP `creator` -> IPTC `Byline`
 */
function buildExifData(parsed: RawExifOutput): ExifData {
  // Prefer string tag '36867'/'36868' if present so raw wall-clock string is parsed directly in UTC
  const date = firstValidDate(
    parsed["36867"],
    parsed.DateTimeOriginal,
    parsed["36868"],
    parsed.CreateDate,
    parsed.DateCreated,
    parsed.DigitalCreationDate,
  );
  const make = firstString(parsed.Make);
  const model = firstString(
    parsed.Model,
    parsed.UniqueCameraModel,
    parsed.LocalizedCameraModel,
  );
  const camera = buildCameraString(make, model);
  const lens = extractLens(parsed);
  const rawFocalLength = firstPositiveNumber(
    parsed.FocalLength,
    parsed.FocalLengthIn35mmFormat,
  );
  const focal_length =
    rawFocalLength !== undefined && rawFocalLength < 65535
      ? Math.round(rawFocalLength * 100) / 100
      : undefined;
  const rawIso = firstPositiveNumber(
    parsed.ISO,
    parsed.ISOSpeedRatings,
    parsed.RecommendedExposureIndex,
    parsed.StandardOutputSensitivity,
    parsed.ISOSpeed,
    parsed.ExposureIndex,
  );
  const iso =
    rawIso !== undefined && rawIso < 10_000_000
      ? Math.round(rawIso)
      : undefined;
  const aperture = extractAperture(parsed);
  const shutter_speed = extractShutterSpeed(parsed);
  const gps_lat = extractGpsCoordinate(
    parsed.latitude,
    parsed.GPSLatitude,
    parsed.GPSLatitudeRef,
    90,
  );
  const gps_lon = extractGpsCoordinate(
    parsed.longitude,
    parsed.GPSLongitude,
    parsed.GPSLongitudeRef,
    180,
  );
  const photographer = firstString(
    parsed.Artist,
    parsed.OwnerName,
    parsed.CameraOwnerName,
    parsed.XPAuthor,
    parsed.creator,
    parsed.Byline,
  );

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
    photographer?: string;
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
  if (photographer !== undefined) result.photographer = photographer;

  return result;
}

function collectIssues(data: ExifData): string[] {
  const issues: string[] = [];
  if (data.date === undefined) issues.push("no date");
  if (data.camera === undefined) issues.push("no camera info");
  if (data.lens === undefined) issues.push("no lens info");
  return issues;
}

/**
 * Strip the optional 6-byte JPEG APP1 "Exif\0\0" prefix so the buffer begins
 * directly at the TIFF header ("II*\0" or "MM\0*"). WebP and PNG EXIF chunks
 * (such as darktable exports) usually begin at the TIFF header directly.
 */
function normalizeExifBuffer(exifBuffer: Buffer): Buffer {
  if (
    exifBuffer.byteLength > 6 &&
    exifBuffer.subarray(0, 6).toString("ascii") === "Exif\0\0"
  ) {
    return exifBuffer.subarray(6);
  }
  return exifBuffer;
}

async function extractRawMetadata(buffer: Buffer): Promise<{
  readonly parsed?: RawExifOutput;
  readonly corrupt: boolean;
}> {
  const merged: Record<string, unknown> = {};
  let containerRecognized = false;
  let exifSegmentCorrupt = false;

  // 1. Direct parse via exifr (handles JPEG, TIFF, PNG, HEIC, AVIF and multi-segment XMP/IPTC).
  // Disable jfif/ihdr/icc so basic image header chunks are not mistaken for EXIF metadata.
  try {
    const direct = (await exifr.parse(buffer, {
      tiff: true,
      ifd0: {},
      exif: true,
      gps: true,
      interop: true,
      xmp: true,
      iptc: true,
      jfif: false,
      ihdr: false,
      icc: false,
      multiSegment: true,
      mergeOutput: true,
    })) as Record<string, unknown> | null | undefined;
    containerRecognized = true;
    if (direct && typeof direct === "object") {
      Object.assign(merged, direct);
    }
  } catch {
    // exifr throws "Unknown file format" on WebP containers; sharp handles those below.
  }

  // 2. Universal container demuxing via sharp (libvips).
  // Extracts raw EXIF, XMP, and IPTC buffers from WebP, JPEG, PNG, TIFF, HEIC, AVIF.
  try {
    const meta = await sharp(buffer).metadata();
    containerRecognized = true;

    if (meta.xmp && meta.xmp.byteLength > 0) {
      try {
        const xmpParsed = (await exifr.parse(meta.xmp.toString("utf8"), {
          xmp: true,
          mergeOutput: true,
        })) as Record<string, unknown> | null | undefined;
        if (xmpParsed && typeof xmpParsed === "object") {
          for (const [k, v] of Object.entries(xmpParsed)) {
            if (merged[k] === undefined && v !== undefined) {
              merged[k] = v;
            }
          }
        }
      } catch {
        // Ignore malformed XMP packet
      }
    }

    if (meta.iptc && meta.iptc.byteLength > 0) {
      try {
        const iptcParsed = (await exifr.sidecar(meta.iptc, {}, "iptc")) as
          | Record<string, unknown>
          | null
          | undefined;
        if (iptcParsed && typeof iptcParsed === "object") {
          for (const [k, v] of Object.entries(iptcParsed)) {
            if (merged[k] === undefined && v !== undefined) {
              merged[k] = v;
            }
          }
        }
      } catch {
        // Ignore malformed IPTC block
      }
    }

    if (meta.exif && meta.exif.byteLength > 0) {
      const tiffBuf = normalizeExifBuffer(meta.exif);
      try {
        const exifParsed = (await exifr.parse(tiffBuf, {
          tiff: true,
          ifd0: {},
          exif: true,
          gps: true,
          interop: true,
          mergeOutput: true,
        })) as Record<string, unknown> | null | undefined;
        if (exifParsed && typeof exifParsed === "object") {
          Object.assign(merged, exifParsed);
        } else if (Object.keys(merged).length === 0) {
          exifSegmentCorrupt = true;
        }
      } catch {
        if (Object.keys(merged).length === 0) {
          exifSegmentCorrupt = true;
        }
      }
    }
  } catch {
    // Ignore sharp error if exifr already recognized the container
  }

  if (!containerRecognized || exifSegmentCorrupt) {
    return { corrupt: true };
  }

  if (Object.keys(merged).length === 0) {
    return { corrupt: false };
  }

  return { parsed: merged as RawExifOutput, corrupt: false };
}

export async function readExif(filePath: string): Promise<ExifResult> {
  let buffer: Buffer;
  try {
    // Read the file ourselves rather than handing exifr a path. exifr's
    // chunked file reader calls `FileHandle.stat(path)`, passing a string
    // where Node expects an options object; Node rejects that, so every
    // path-based parse throws and leaks the open handle.
    buffer = await readFile(filePath);
  } catch {
    return {
      data: {},
      warning: { filePath, issues: ["corrupt EXIF"] },
    };
  }

  const { parsed, corrupt } = await extractRawMetadata(buffer);

  if (corrupt) {
    return {
      data: {},
      warning: { filePath, issues: ["corrupt EXIF"] },
    };
  }

  if (!parsed) {
    return {
      data: {},
      warning: { filePath, issues: ["no EXIF data"] },
    };
  }

  const data = buildExifData(parsed);
  const issues = collectIssues(data);

  if (issues.length > 0) {
    return { data, warning: { filePath, issues } };
  }

  return { data };
}

export function formatExifWarnings(warnings: readonly ExifWarning[]): string {
  if (warnings.length === 0) return "";

  const lines = [
    `\u26A0 Missing or corrupt EXIF data in ${String(warnings.length)} photo${warnings.length === 1 ? "" : "s"}:`,
  ];

  for (const w of warnings) {
    lines.push(`  - ${w.filePath} (${w.issues.join(", ")})`);
  }

  lines.push(
    "  Tip: fill in the missing fields in the corresponding sidecar YAML files.",
  );

  return lines.join("\n");
}
