import { slugifyLocation } from './slugs.js';
import type { Gallery, LocationPage } from './types.js';

/**
 * Collect all unique locations across all galleries and build a LocationPage for each.
 * Photos are sorted by date descending within each location.
 */
export function buildLocationPages(
  galleries: readonly Gallery[],
): readonly LocationPage[] {
  const locationMap = new Map<
    string,
    { photo: (typeof galleries)[number]['photos'][number]; gallery: Gallery }[]
  >();

  for (const gallery of galleries) {
    for (const photo of gallery.photos) {
      const loc = photo.metadata.location;
      if (loc === '') continue;
      const key = loc.toLowerCase();
      let list = locationMap.get(key);
      if (!list) {
        list = [];
        locationMap.set(key, list);
      }
      list.push({ photo, gallery });
    }
  }

  const locationPages: LocationPage[] = [];

  for (const [location, photos] of locationMap) {
    const sorted = [...photos].sort((a, b) => {
      const dateA = a.photo.metadata.date ?? a.photo.exif.date ?? new Date(0);
      const dateB = b.photo.metadata.date ?? b.photo.exif.date ?? new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    locationPages.push({
      location,
      slug: slugifyLocation(location),
      photos: sorted,
    });
  }

  // Sort location pages alphabetically
  locationPages.sort((a, b) => a.location.localeCompare(b.location));

  return locationPages;
}
