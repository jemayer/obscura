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
  knownTags: ReadonlySet<string>,
  knownLocations: ReadonlySet<string>,
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

  const sortedLocations = [...knownLocations].sort();
  let locationValue = '';

  if (sortedLocations.length > 0) {
    const NEW_LOCATION = '__new__';
    const KEEP_CURRENT = '__keep__';
    const locationOptions: { value: string; label: string }[] = [];

    locationOptions.push({ value: KEEP_CURRENT, label: `Keep current ("${target.currentValues.location || '(empty)'}")` });
    for (const loc of sortedLocations) {
      locationOptions.push({ value: loc, label: loc });
    }
    locationOptions.push({ value: NEW_LOCATION, label: 'Enter new location' });

    const locationSelect = await p.select({
      message: `Location (current: "${target.currentValues.location}")`,
      options: locationOptions,
      initialValue: target.currentValues.location !== '' && knownLocations.has(target.currentValues.location)
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

  const knownTags = new Set(collectAllTags(allTargets));
  const knownLocations = new Set(collectAllLocations(allTargets));

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

    const result = await promptForEdits(target, knownTags, knownLocations);

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
