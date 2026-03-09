import { readdir, readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { parseDocument } from 'yaml';
import { writeFile } from 'node:fs/promises';
import { isPhotoFile, sidecarPathForPhoto } from './sidecar.js';

export type EditableField = 'title' | 'location' | 'caption' | 'tags';

export interface SidecarFilter {
  readonly field: EditableField | 'all';
}

export interface SidecarSnapshot {
  readonly title: string;
  readonly location: string;
  readonly caption: string;
  readonly tags: readonly string[];
  readonly license?: string;
  readonly camera?: string;
  readonly date?: Date;
  readonly lens?: string;
  readonly focal_length?: number;
  readonly iso?: number;
  readonly aperture?: number;
  readonly shutter_speed?: string;
}

export interface SidecarEditTarget {
  readonly photoPath: string;
  readonly sidecarPath: string;
  readonly gallerySlug: string;
  readonly filename: string;
  readonly currentValues: SidecarSnapshot;
}

export interface SidecarEdits {
  readonly title?: string;
  readonly location?: string;
  readonly caption?: string;
  readonly tags?: readonly string[];
  readonly license?: string;
}

function parseDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  return '';
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function loadSidecarSnapshot(content: string): SidecarSnapshot {
  const doc = parseDocument(content);
  const data = doc.toJSON() as Record<string, unknown> | null;
  if (data === null || typeof data !== 'object') {
    return { title: '', location: '', caption: '', tags: [] };
  }
  const camera = asString(data['camera']);
  const lens = asString(data['lens']);
  const date = parseDate(data['date']);

  const license = asString(data['license']);
  const base = {
    title: asString(data['title']),
    location: asString(data['location']),
    caption: asString(data['caption']),
    tags: asStringArray(data['tags']),
    ...(license ? { license } : {}),
  };

  const focal_length =
    typeof data['focal_length'] === 'number' ? data['focal_length'] : undefined;
  const iso = typeof data['iso'] === 'number' ? data['iso'] : undefined;
  const aperture =
    typeof data['aperture'] === 'number' ? data['aperture'] : undefined;
  const shutter_speed = asString(data['shutter_speed']);

  return {
    ...base,
    ...(camera ? { camera } : {}),
    ...(lens ? { lens } : {}),
    ...(date !== undefined ? { date } : {}),
    ...(focal_length !== undefined ? { focal_length } : {}),
    ...(iso !== undefined ? { iso } : {}),
    ...(aperture !== undefined ? { aperture } : {}),
    ...(shutter_speed ? { shutter_speed } : {}),
  };
}

export async function loadSidecarSnapshotFromFile(
  sidecarPath: string,
): Promise<SidecarSnapshot> {
  try {
    const content = await readFile(sidecarPath, 'utf-8');
    return loadSidecarSnapshot(content);
  } catch {
    return { title: '', location: '', caption: '', tags: [] };
  }
}

export async function scanGallery(
  galleryDir: string,
  gallerySlug: string,
): Promise<readonly SidecarEditTarget[]> {
  let entries: string[];
  try {
    const dirEntries = await readdir(galleryDir);
    entries = dirEntries.filter(isPhotoFile).sort();
  } catch {
    return [];
  }

  const targets: SidecarEditTarget[] = [];
  for (const entry of entries) {
    const photoPath = resolve(galleryDir, entry);
    const sidecarPath = sidecarPathForPhoto(photoPath);
    const currentValues = await loadSidecarSnapshotFromFile(sidecarPath);
    targets.push({
      photoPath,
      sidecarPath,
      gallerySlug,
      filename: basename(entry),
      currentValues,
    });
  }
  return targets;
}

export function filterTargets(
  targets: readonly SidecarEditTarget[],
  filter: SidecarFilter,
): readonly SidecarEditTarget[] {
  if (filter.field === 'all') return targets;
  return targets.filter((t) => {
    switch (filter.field) {
      case 'title':
        return t.currentValues.title === '';
      case 'location':
        return t.currentValues.location === '';
      case 'caption':
        return t.currentValues.caption === '';
      case 'tags':
        return t.currentValues.tags.length === 0;
    }
  });
}

export async function writeSidecarEdits(
  sidecarPath: string,
  edits: SidecarEdits,
): Promise<void> {
  const content = await readFile(sidecarPath, 'utf-8');
  const doc = parseDocument(content);

  if (edits.title !== undefined) {
    doc.set('title', edits.title);
  }
  if (edits.location !== undefined) {
    doc.set('location', edits.location);
  }
  if (edits.caption !== undefined) {
    doc.set('caption', edits.caption);
  }
  if (edits.tags !== undefined) {
    doc.set('tags', [...edits.tags]);
  }
  if (edits.license !== undefined) {
    doc.set('license', edits.license);
  }

  await writeFile(sidecarPath, doc.toString(), 'utf-8');
}

export function collectAllTags(
  targets: readonly SidecarEditTarget[],
): readonly string[] {
  const seen = new Set<string>();
  for (const t of targets) {
    for (const tag of t.currentValues.tags) {
      seen.add(tag);
    }
  }
  return [...seen].sort();
}

export function collectAllLocations(
  targets: readonly SidecarEditTarget[],
): readonly string[] {
  const seen = new Set<string>();
  for (const t of targets) {
    if (t.currentValues.location !== '') {
      seen.add(t.currentValues.location);
    }
  }
  return [...seen].sort();
}

export function countByFilter(
  targets: readonly SidecarEditTarget[],
): Record<EditableField | 'all', number> {
  return {
    all: targets.length,
    title: targets.filter((t) => t.currentValues.title === '').length,
    location: targets.filter((t) => t.currentValues.location === '').length,
    caption: targets.filter((t) => t.currentValues.caption === '').length,
    tags: targets.filter((t) => t.currentValues.tags.length === 0).length,
  };
}
