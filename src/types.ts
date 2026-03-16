// ---------------------------------------------------------------------------
// Site Configuration
// ---------------------------------------------------------------------------

export interface ImageConfig {
  readonly breakpoints: readonly number[];
  readonly webp_quality: number;
}

/**
 * Valid display-field names for photo pages and lightbox overlays.
 * - date: capture date
 * - camera: camera model
 * - lens: lens model
 * - settings: focal length, aperture, ISO, shutter speed
 * - location: location name
 * - tags: tag list (photo page only)
 * - license: license badge
 *
 * In config YAML, "exif" is accepted as a shorthand alias that expands to
 * date + camera + lens + settings.
 */
export type DisplayField =
  | 'date'
  | 'camera'
  | 'lens'
  | 'settings'
  | 'location'
  | 'tags'
  | 'license';

/** The sub-fields that the "exif" alias expands to. */
export const EXIF_SUB_FIELDS: readonly DisplayField[] = [
  'date',
  'camera',
  'lens',
  'settings',
] as const;

export const ALL_DISPLAY_FIELDS: readonly DisplayField[] = [
  'date',
  'camera',
  'lens',
  'settings',
  'location',
  'tags',
  'license',
] as const;

export type GalleryLayout = 'grid' | 'masonry';

export type SocialPlatform =
  | '500px'
  | 'bluesky'
  | 'flickr'
  | 'github'
  | 'instagram'
  | 'mastodon'
  | 'pixelfed';

export interface SocialLink {
  readonly platform: SocialPlatform;
  readonly url: string;
}

export interface SiteConfig {
  readonly base_url: string;
  readonly base_path: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly theme: string;
  readonly recent_shots_count: number;
  readonly images: ImageConfig;
  readonly license: string;
  readonly gallery_default_layout: GalleryLayout;
  readonly social_links: readonly SocialLink[];
  readonly photo_display_fields: readonly DisplayField[];
  readonly lightbox_display_fields: readonly DisplayField[];
  /** Optional hero image for homepage: "gallery-slug/photo-slug" */
  readonly hero_image?: string | undefined;
}

// ---------------------------------------------------------------------------
// Gallery Configuration
// ---------------------------------------------------------------------------

export interface GalleryEntry {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly listed: boolean;
  readonly layout?: GalleryLayout | undefined;
}

export interface GalleryConfig {
  readonly galleries: readonly GalleryEntry[];
}

// ---------------------------------------------------------------------------
// Licensing
// ---------------------------------------------------------------------------

export const KNOWN_LICENSE_TYPES = [
  'all-rights-reserved',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC-BY-NC-4.0',
  'CC-BY-NC-SA-4.0',
  'CC-BY-ND-4.0',
  'CC-BY-NC-ND-4.0',
  'CC0-1.0',
] as const;

export type KnownLicenseType = (typeof KNOWN_LICENSE_TYPES)[number];

/** Maps known CC license types to their deed URLs. */
export const LICENSE_URLS: Readonly<Record<string, string>> = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC-BY-NC-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'CC-BY-NC-SA-4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  'CC-BY-ND-4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
  'CC-BY-NC-ND-4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

/** Maps known license type identifiers to human-readable short labels. */
export const LICENSE_LABELS: Readonly<Record<string, string>> = {
  'all-rights-reserved': '\u00A9 All Rights Reserved',
  'CC-BY-4.0': 'CC BY 4.0',
  'CC-BY-SA-4.0': 'CC BY-SA 4.0',
  'CC-BY-NC-4.0': 'CC BY-NC 4.0',
  'CC-BY-NC-SA-4.0': 'CC BY-NC-SA 4.0',
  'CC-BY-ND-4.0': 'CC BY-ND 4.0',
  'CC-BY-NC-ND-4.0': 'CC BY-NC-ND 4.0',
  'CC0-1.0': 'CC0 1.0',
};

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

export interface ExifData {
  readonly date?: Date;
  readonly camera?: string;
  readonly lens?: string;
  readonly focal_length?: number;
  readonly iso?: number;
  readonly aperture?: number;
  readonly shutter_speed?: string;
  readonly gps_lat?: number;
  readonly gps_lon?: number;
}

export interface PhotoMetadata {
  readonly title: string;
  readonly date?: Date;
  readonly camera?: string;
  readonly lens?: string;
  readonly focal_length?: number;
  readonly iso?: number;
  readonly aperture?: number;
  readonly shutter_speed?: string;
  readonly gps_lat?: number;
  readonly gps_lon?: number;
  readonly location: string;
  readonly caption: string;
  readonly tags: readonly string[];
  readonly license: string;
}

export interface ImageVariant {
  readonly width: number;
  readonly height: number;
  readonly path: string;
}

export interface Photo {
  readonly slug: string;
  readonly gallerySlug: string;
  readonly sourcePath: string;
  readonly metadata: PhotoMetadata;
  readonly exif: ExifData;
  readonly variants: readonly ImageVariant[];
  readonly thumbnailPath: string;
}

// ---------------------------------------------------------------------------
// Gallery (assembled)
// ---------------------------------------------------------------------------

export interface Gallery {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly listed: boolean;
  readonly layout?: GalleryLayout | undefined;
  readonly photos: readonly Photo[];
  /** Rendered HTML from an optional index.md in the gallery folder. */
  readonly renderedContent?: string | undefined;
}

// ---------------------------------------------------------------------------
// Blog Post
// ---------------------------------------------------------------------------

export interface BlogPostFrontmatter {
  readonly title: string;
  readonly date: Date;
  readonly tags: readonly string[];
  readonly summary?: string;
}

export interface BlogPost {
  readonly slug: string;
  readonly frontmatter: BlogPostFrontmatter;
  readonly content: string;
  readonly renderedContent: string;
  readonly referencedPhotos: readonly string[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export interface PageFrontmatter {
  readonly title: string;
}

export interface Page {
  readonly slug: string;
  readonly frontmatter: PageFrontmatter;
  readonly content: string;
  readonly renderedContent: string;
}

// ---------------------------------------------------------------------------
// Tag Page
// ---------------------------------------------------------------------------

export interface TagPage {
  readonly tag: string;
  readonly slug: string;
  readonly photos: readonly {
    readonly photo: Photo;
    readonly gallery: Gallery;
  }[];
}

// ---------------------------------------------------------------------------
// Location Page
// ---------------------------------------------------------------------------

export interface LocationPage {
  readonly location: string;
  readonly slug: string;
  readonly photos: readonly {
    readonly photo: Photo;
    readonly gallery: Gallery;
  }[];
}

// ---------------------------------------------------------------------------
// Cross-Reference Graph
// ---------------------------------------------------------------------------

export interface CrossReferenceGraph {
  /** Map from photo slug to the slugs of posts that reference it */
  readonly photoToPostSlugs: ReadonlyMap<string, readonly string[]>;
  /** Map from post slug to the slugs of photos it references */
  readonly postToPhotoSlugs: ReadonlyMap<string, readonly string[]>;
}

// ---------------------------------------------------------------------------
// Build Context — assembled data passed to the rendering stage
// ---------------------------------------------------------------------------

export interface BuildContext {
  readonly siteConfig: SiteConfig;
  readonly galleries: readonly Gallery[];
  readonly posts: readonly BlogPost[];
  readonly pages: readonly Page[];
  readonly crossReferences: CrossReferenceGraph;
  readonly tagPages: readonly TagPage[];
  readonly locationPages: readonly LocationPage[];
  /** Rendered HTML from content/pages/index.md, if present */
  readonly homepageContent?: string | undefined;
  /** Rendered HTML from content/photos/index.md, if present */
  readonly galleryIndexContent?: string | undefined;
}
