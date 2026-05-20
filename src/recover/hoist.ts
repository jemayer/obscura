import type { PhotoMetadata } from '../types.js';

export interface HoistResult {
  /** Set when every photo had the same `license`; the shared value. */
  readonly siteLicense?: string;
  /** Set when every photo had the same `photographer`; the shared value. */
  readonly defaultPhotographer?: string;
  /** Per-photo metadata with the hoisted fields removed where they matched. */
  readonly strippedMetadata: readonly Partial<PhotoMetadata>[];
}

/**
 * Detect uniform values across all photos for `license` and `photographer`
 * and hoist them out of per-photo sidecars. Photos whose value differs from
 * the hoisted default keep the per-sidecar field as an override.
 *
 * Only hoists when EVERY photo specified the same value — partial coverage
 * (e.g. some photos missing the field) is not hoisted, because the absent
 * sidecars would then implicitly inherit a value the upstream may not have
 * intended.
 */
export function hoistCommonFields(
  metadataList: readonly Partial<PhotoMetadata>[],
): HoistResult {
  if (metadataList.length === 0) {
    return { strippedMetadata: [] };
  }

  const uniformValue = (
    pick: (m: Partial<PhotoMetadata>) => string | undefined,
  ): string | undefined => {
    const values = metadataList.map(pick);
    if (values.some((v) => v === undefined)) return undefined;
    const unique = new Set(values);
    return unique.size === 1 ? values[0] : undefined;
  };

  const siteLicense = uniformValue((m) => m.license);
  const defaultPhotographer = uniformValue((m) => m.photographer);

  const strippedMetadata = metadataList.map(
    (m): Partial<PhotoMetadata> => {
      const result: Partial<PhotoMetadata> = {};
      for (const [key, val] of Object.entries(m)) {
        if (key === 'license' && val === siteLicense) continue;
        if (key === 'photographer' && val === defaultPhotographer) continue;
        (result as Record<string, unknown>)[key] = val;
      }
      return result;
    },
  );

  return {
    ...(siteLicense !== undefined && { siteLicense }),
    ...(defaultPhotographer !== undefined && { defaultPhotographer }),
    strippedMetadata,
  };
}
