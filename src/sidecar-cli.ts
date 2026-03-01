import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import terminalImage from 'terminal-image';
import { loadGalleryConfig } from './config.js';
import { generateSidecars } from './sidecar.js';
import type { GalleryEntry } from './types.js';
import {
  scanGallery,
  filterTargets,
  countByFilter,
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
  return parts.length > 0 ? parts.join(' · ') : 'No EXIF data';
}

async function showPreview(photoPath: string): Promise<void> {
  try {
    const image = await terminalImage.file(photoPath, {
      width: '50%',
      height: '50%',
    });
    console.log(image);
  } catch {
    p.log.warn('Could not display image preview.');
  }
}

async function promptForEdits(
  target: SidecarEditTarget,
): Promise<SidecarEdits | 'skip' | 'quit'> {
  const edits: {
    title?: string;
    location?: string;
    caption?: string;
    tags?: readonly string[];
  } = {};

  const titleResult = await p.text({
    message: `Title (current: "${target.currentValues.title}")`,
    placeholder: 'Leave empty to keep current value',
    defaultValue: '',
  });
  if (p.isCancel(titleResult)) return 'quit';
  if (titleResult !== '') edits.title = titleResult;

  const locationResult = await p.text({
    message: `Location (current: "${target.currentValues.location}")`,
    placeholder: 'Leave empty to keep current value',
    defaultValue: '',
  });
  if (p.isCancel(locationResult)) return 'quit';
  if (locationResult !== '') edits.location = locationResult;

  const captionResult = await p.text({
    message: `Caption (current: "${target.currentValues.caption}")`,
    placeholder: 'Leave empty to keep current value',
    defaultValue: '',
  });
  if (p.isCancel(captionResult)) return 'quit';
  if (captionResult !== '') edits.caption = captionResult;

  const currentTags =
    target.currentValues.tags.length > 0
      ? target.currentValues.tags.join(', ')
      : 'none';
  const tagsResult = await p.text({
    message: `Tags (comma-separated, current: ${currentTags})`,
    placeholder: 'Leave empty to keep current value',
    defaultValue: '',
  });
  if (p.isCancel(tagsResult)) return 'quit';
  if (tagsResult !== '') {
    edits.tags = tagsResult
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '');
  }

  // If no edits were made, treat as skip
  if (
    edits.title === undefined &&
    edits.location === undefined &&
    edits.caption === undefined &&
    edits.tags === undefined
  ) {
    return 'skip';
  }

  return edits;
}

async function main(): Promise<void> {
  const projectDir = resolve(process.cwd());

  p.intro('comagen — sidecar editor');

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

  const listedGalleries = galleryConfig.galleries.filter((g) => g.listed);
  if (listedGalleries.length === 0) {
    p.cancel('No galleries found in config/galleries.yaml.');
    process.exitCode = 1;
    return;
  }

  const photosDir = resolve(projectDir, 'content', 'photos');

  // Count photos per gallery for display
  const galleryCounts = new Map<string, number>();
  for (const gallery of listedGalleries) {
    const galleryDir = resolve(photosDir, gallery.slug);
    const targets = await scanGallery(galleryDir, gallery.slug);
    galleryCounts.set(gallery.slug, targets.length);
  }

  // Gallery selection — use slug strings as values, with 'all' as a special key
  const galleryOptions: { value: string; label: string; hint?: string }[] =
    listedGalleries.map((g) => ({
      value: g.slug,
      label: g.title,
      hint: `${String(galleryCounts.get(g.slug) ?? 0)} photos`,
    }));

  if (listedGalleries.length > 1) {
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
      ? listedGalleries
      : listedGalleries.filter((g) => g.slug === selectedSlug);

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
  const filterOptions: { value: EditableField | 'all'; label: string; hint?: string }[] = [
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

    const result = await promptForEdits(target);

    if (result === 'quit') {
      p.cancel('Cancelled.');
      break;
    }

    if (result === 'skip') {
      p.log.warn(`Skipped ${target.filename}`);
      continue;
    }

    await writeSidecarEdits(target.sidecarPath, result);
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
