import { slugifyTag } from './slugs.js';
import type { Gallery, TagPage } from './types.js';

/**
 * Collect all unique tags across all galleries and build a TagPage for each.
 * Photos are sorted by date descending within each tag.
 */
export function buildTagPages(galleries: readonly Gallery[]): readonly TagPage[] {
  const tagMap = new Map<string, { photo: typeof galleries[number]['photos'][number]; gallery: Gallery }[]>();

  for (const gallery of galleries) {
    for (const photo of gallery.photos) {
      for (const tag of photo.metadata.tags) {
        const key = tag.toLowerCase();
        let list = tagMap.get(key);
        if (!list) {
          list = [];
          tagMap.set(key, list);
        }
        list.push({ photo, gallery });
      }
    }
  }

  const tagPages: TagPage[] = [];

  for (const [tag, photos] of tagMap) {
    const sorted = [...photos].sort((a, b) => {
      const dateA = a.photo.metadata.date ?? a.photo.exif.date ?? new Date(0);
      const dateB = b.photo.metadata.date ?? b.photo.exif.date ?? new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    tagPages.push({
      tag,
      slug: slugifyTag(tag),
      photos: sorted,
    });
  }

  // Sort tag pages alphabetically
  tagPages.sort((a, b) => a.tag.localeCompare(b.tag));

  return tagPages;
}
