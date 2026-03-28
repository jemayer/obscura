import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import sharp from 'sharp';
import { loadGalleryConfig, loadSiteConfig } from './config.js';
import { generateSidecars } from './sidecar.js';
import type { GalleryEntry } from './types.js';
import { KNOWN_LICENSE_TYPES, LICENSE_LABELS } from './types.js';
import {
  scanGallery,
  filterTargets,
  countByFilter,
  collectAllTags,
  collectAllLocations,
  writeSidecarEdits,
  type EditableField,
  type SidecarFilter,
  type SidecarEditTarget,
  type SidecarEdits,
} from './sidecar-edit.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function buildContextLine(target: SidecarEditTarget): string {
  const parts: string[] = [];
  if (target.currentValues.camera) {
    parts.push(target.currentValues.camera);
  }
  if (target.currentValues.date) {
    parts.push(formatDate(target.currentValues.date));
  }
  if (target.currentValues.lens) {
    parts.push(target.currentValues.lens);
  }
  if (target.currentValues.focal_length !== undefined) {
    parts.push(`${String(target.currentValues.focal_length)}mm`);
  }
  if (target.currentValues.iso !== undefined) {
    parts.push(`ISO ${String(target.currentValues.iso)}`);
  }
  if (target.currentValues.aperture !== undefined) {
    parts.push(`f/${String(target.currentValues.aperture)}`);
  }
  if (target.currentValues.shutter_speed) {
    parts.push(`${target.currentValues.shutter_speed}s`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'No EXIF data';
}

/**
 * Render a photo as colored ANSI half-block characters in the terminal.
 * Uses sharp to resize to a small thumbnail, then pairs rows of pixels
 * using the Unicode upper-half-block (▀) with 24-bit ANSI colors:
 * foreground = top pixel, background = bottom pixel → 2 rows per line.
 */
async function renderAnsiImage(
  photoPath: string,
  cols: number,
): Promise<string> {
  const { info, data } = await sharp(photoPath)
    .resize({ width: cols, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const lines: string[] = [];

  for (let y = 0; y < h; y += 2) {
    let line = '';
    for (let x = 0; x < w; x++) {
      const topIdx = (y * w + x) * 4;
      const tr = String(data[topIdx] ?? 0);
      const tg = String(data[topIdx + 1] ?? 0);
      const tb = String(data[topIdx + 2] ?? 0);

      if (y + 1 < h) {
        const botIdx = ((y + 1) * w + x) * 4;
        const br = String(data[botIdx] ?? 0);
        const bg = String(data[botIdx + 1] ?? 0);
        const bb = String(data[botIdx + 2] ?? 0);
        // Upper-half-block: fg = top pixel, bg = bottom pixel
        line += `\x1b[38;2;${tr};${tg};${tb}m\x1b[48;2;${br};${bg};${bb}m▀`;
      } else {
        // Odd last row: top pixel only
        line += `\x1b[38;2;${tr};${tg};${tb}m▀`;
      }
    }
    line += '\x1b[0m';
    lines.push(line);
  }
  return lines.join('\n');
}

async function showPreview(photoPath: string): Promise<void> {
  try {
    const cols = Math.min(process.stdout.columns, 80);
    const image = await renderAnsiImage(photoPath, cols);
    console.log(image);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    p.log.warn(`Could not display image preview: ${msg}`);
  }
}

async function promptForEdits(
  target: SidecarEditTarget,
  knownTags: ReadonlySet<string>,
  knownLocations: ReadonlySet<string>,
  defaultLicense: string,
): Promise<SidecarEdits | 'skip' | 'quit'> {
  const edits: {
    title?: string;
    location?: string;
    caption?: string;
    tags?: readonly string[];
    license?: string;
  } = {};

  const titleResult = await p.text({
    message: `Title (current: "${target.currentValues.title}")`,
    placeholder: 'Leave empty to keep current value',
    defaultValue: '',
  });
  if (p.isCancel(titleResult)) return 'quit';
  if (titleResult !== '') edits.title = titleResult;

  const sortedLocations = [...knownLocations].sort();
  let locationValue = '';

  if (sortedLocations.length > 0) {
    const NEW_LOCATION = '__new__';
    const KEEP_CURRENT = '__keep__';
    const locationOptions: { value: string; label: string }[] = [];

    locationOptions.push({
      value: KEEP_CURRENT,
      label: `Keep current ("${target.currentValues.location || '(empty)'}")`,
    });
    for (const loc of sortedLocations) {
      locationOptions.push({ value: loc, label: loc });
    }
    locationOptions.push({ value: NEW_LOCATION, label: 'Enter new location' });

    const locationSelect = await p.select({
      message: `Location (current: "${target.currentValues.location}")`,
      options: locationOptions,
      initialValue:
        target.currentValues.location !== '' &&
        knownLocations.has(target.currentValues.location)
          ? target.currentValues.location
          : KEEP_CURRENT,
    });
    if (p.isCancel(locationSelect)) return 'quit';

    if (locationSelect === NEW_LOCATION) {
      const newLoc = await p.text({
        message: 'Enter new location',
        placeholder: 'Leave empty to keep current value',
        defaultValue: '',
      });
      if (p.isCancel(newLoc)) return 'quit';
      locationValue = newLoc;
    } else if (locationSelect !== KEEP_CURRENT) {
      locationValue = locationSelect;
    }
  } else {
    const locationResult = await p.text({
      message: `Location (current: "${target.currentValues.location}")`,
      placeholder: 'Leave empty to keep current value',
      defaultValue: '',
    });
    if (p.isCancel(locationResult)) return 'quit';
    locationValue = locationResult;
  }

  if (locationValue !== '' && locationValue !== target.currentValues.location) {
    edits.location = locationValue;
  }

  const captionResult = await p.text({
    message: `Caption (current: "${target.currentValues.caption}")`,
    placeholder: 'Leave empty to keep current value',
    defaultValue: '',
  });
  if (p.isCancel(captionResult)) return 'quit';
  if (captionResult !== '') edits.caption = captionResult;

  // --- Tag editing ---
  const currentPhotoTags = target.currentValues.tags;
  const sortedKnown = [...knownTags].sort();

  let selectedTags: string[];

  if (sortedKnown.length > 0) {
    const multiResult = await p.multiselect({
      message: 'Tags (select existing)',
      options: sortedKnown.map((t) => ({ value: t, label: t })),
      initialValues: [...currentPhotoTags],
      required: false,
    });
    if (p.isCancel(multiResult)) return 'quit';
    selectedTags = multiResult;
  } else {
    selectedTags = [];
  }

  const newTagsResult = await p.text({
    message:
      sortedKnown.length > 0
        ? 'Add new tags (comma-separated, or leave empty)'
        : 'Tags (comma-separated)',
    placeholder: 'Leave empty to skip',
    defaultValue: '',
  });
  if (p.isCancel(newTagsResult)) return 'quit';

  const newTags =
    newTagsResult !== ''
      ? newTagsResult
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t !== '')
      : [];

  const finalTags = [...selectedTags, ...newTags];

  const tagsChanged =
    finalTags.length !== currentPhotoTags.length ||
    finalTags.some((t, i) => t !== currentPhotoTags[i]);

  if (tagsChanged) {
    edits.tags = finalTags;
  }

  // --- License editing ---
  const currentLicense = target.currentValues.license ?? defaultLicense;
  const KEEP_LICENSE = '__keep__';
  const CUSTOM_LICENSE = '__custom__';
  const licenseOptions: { value: string; label: string }[] = [
    {
      value: KEEP_LICENSE,
      label: `Keep current (${LICENSE_LABELS[currentLicense] ?? currentLicense})`,
    },
  ];
  for (const lt of KNOWN_LICENSE_TYPES) {
    if (lt !== currentLicense) {
      licenseOptions.push({ value: lt, label: LICENSE_LABELS[lt] ?? lt });
    }
  }
  licenseOptions.push({ value: CUSTOM_LICENSE, label: 'Custom license text' });

  const licenseSelect = await p.select({
    message: `License (current: ${LICENSE_LABELS[currentLicense] ?? currentLicense})`,
    options: licenseOptions,
    initialValue: KEEP_LICENSE,
  });
  if (p.isCancel(licenseSelect)) return 'quit';

  if (licenseSelect === CUSTOM_LICENSE) {
    const customLicense = await p.text({
      message: 'Enter custom license text',
      placeholder: 'e.g. "Licensed under my terms"',
      defaultValue: '',
    });
    if (p.isCancel(customLicense)) return 'quit';
    if (customLicense !== '' && customLicense !== currentLicense) {
      edits.license = customLicense;
    }
  } else if (
    licenseSelect !== KEEP_LICENSE &&
    licenseSelect !== currentLicense
  ) {
    edits.license = licenseSelect;
  }

  // If no edits were made, treat as skip
  if (
    edits.title === undefined &&
    edits.location === undefined &&
    edits.caption === undefined &&
    edits.tags === undefined &&
    edits.license === undefined
  ) {
    return 'skip';
  }

  return edits;
}

async function main(): Promise<void> {
  const projectDir = resolve(process.cwd());

  p.intro('Obscura — sidecar editor');

  // Load site config (for default license)
  let siteConfig;
  try {
    siteConfig = await loadSiteConfig(projectDir);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    p.cancel(`Could not load site config: ${msg}`);
    process.exitCode = 1;
    return;
  }

  // Load gallery config
  let galleryConfig;
  try {
    galleryConfig = await loadGalleryConfig(projectDir);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    p.cancel(`Could not load gallery config: ${msg}`);
    process.exitCode = 1;
    return;
  }

  const allGalleries = galleryConfig.galleries;
  if (allGalleries.length === 0) {
    p.cancel('No galleries found in site/config/galleries.yaml.');
    process.exitCode = 1;
    return;
  }

  const photosDir = resolve(projectDir, 'site', 'content', 'photos');

  // Scan all galleries to count photos and collect global tags/locations
  const galleryCounts = new Map<string, number>();
  let globalTargets: SidecarEditTarget[] = [];
  for (const gallery of allGalleries) {
    const galleryDir = resolve(photosDir, gallery.slug);
    const targets = await scanGallery(galleryDir, gallery.slug);
    galleryCounts.set(gallery.slug, targets.length);
    globalTargets = globalTargets.concat(targets);
  }
  const knownTags = new Set(collectAllTags(globalTargets));
  const knownLocations = new Set(collectAllLocations(globalTargets));

  // Gallery selection — use slug strings as values, with 'all' as a special key
  const galleryOptions: { value: string; label: string; hint?: string }[] =
    allGalleries.map((g) => ({
      value: g.slug,
      label: g.title,
      hint: `${String(galleryCounts.get(g.slug) ?? 0)} photos`,
    }));

  if (allGalleries.length > 1) {
    const totalPhotos = [...galleryCounts.values()].reduce((a, b) => a + b, 0);
    galleryOptions.push({
      value: 'all',
      label: 'All galleries',
      hint: `${String(totalPhotos)} photos`,
    });
  }

  const selectedSlug = await p.select({
    message: 'Which gallery?',
    options: galleryOptions,
  });
  if (p.isCancel(selectedSlug)) {
    p.cancel('Cancelled.');
    return;
  }

  // Determine which galleries to work on
  const selectedGalleries: readonly GalleryEntry[] =
    selectedSlug === 'all'
      ? allGalleries
      : allGalleries.filter((g) => g.slug === selectedSlug);

  // Generate sidecars first
  const spin = p.spinner();
  spin.start('Generating missing sidecars…');
  for (const gallery of selectedGalleries) {
    const galleryDir = resolve(photosDir, gallery.slug);
    await generateSidecars(galleryDir);
  }
  spin.stop('Sidecars ready.');

  // Scan all selected galleries
  let allTargets: SidecarEditTarget[] = [];
  for (const gallery of selectedGalleries) {
    const galleryDir = resolve(photosDir, gallery.slug);
    const targets = await scanGallery(galleryDir, gallery.slug);
    allTargets = allTargets.concat(targets);
  }

  if (allTargets.length === 0) {
    p.outro('No photos found.');
    return;
  }

  // Filter selection
  const counts = countByFilter(allTargets);
  const filterOptions: {
    value: EditableField | 'all';
    label: string;
    hint?: string;
  }[] = [
    { value: 'all', label: 'All photos', hint: String(counts.all) },
    { value: 'title', label: 'Missing title', hint: String(counts.title) },
    {
      value: 'location',
      label: 'Missing location',
      hint: String(counts.location),
    },
    {
      value: 'caption',
      label: 'Missing caption',
      hint: String(counts.caption),
    },
    { value: 'tags', label: 'Missing tags', hint: String(counts.tags) },
  ];

  const selectedFilter = await p.select({
    message: 'Which photos?',
    options: filterOptions,
  });
  if (p.isCancel(selectedFilter)) {
    p.cancel('Cancelled.');
    return;
  }

  const filter: SidecarFilter = { field: selectedFilter };
  const filtered = filterTargets(allTargets, filter);

  if (filtered.length === 0) {
    p.outro('No photos match that filter.');
    return;
  }

  // Edit loop
  let editedCount = 0;
  for (const [i, target] of filtered.entries()) {
    p.log.step(
      `Photo ${String(i + 1)} of ${String(filtered.length)} — ${target.filename}`,
    );

    await showPreview(target.photoPath);
    p.log.info(buildContextLine(target));

    const result = await promptForEdits(
      target,
      knownTags,
      knownLocations,
      siteConfig.license,
    );

    if (result === 'quit') {
      p.cancel('Cancelled.');
      break;
    }

    if (result === 'skip') {
      p.log.warn(`Skipped ${target.filename}`);
      continue;
    }

    await writeSidecarEdits(target.sidecarPath, result);
    if (result.tags) {
      for (const tag of result.tags) {
        knownTags.add(tag);
      }
    }
    if (result.location) {
      knownLocations.add(result.location);
    }
    editedCount++;
    p.log.success(`Saved ${target.filename}`);

    // After each photo (except last), ask whether to continue
    if (i < filtered.length - 1) {
      const next = await p.select({
        message: 'Next action?',
        options: [
          { value: 'continue', label: 'Continue to next photo' },
          { value: 'quit', label: 'Quit' },
        ],
      });
      if (p.isCancel(next) || next === 'quit') {
        p.cancel('Cancelled.');
        break;
      }
    }
  }

  p.outro(
    `Done! Edited ${String(editedCount)} of ${String(filtered.length)} photos.`,
  );
}

void main();
