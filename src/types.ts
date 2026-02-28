// ---------------------------------------------------------------------------
// Site Configuration
// ---------------------------------------------------------------------------

export interface ImageConfig {
  readonly breakpoints: readonly number[];
  readonly webp_quality: number;
}

export interface SiteConfig {
  readonly base_url: string;
  readonly title: string;
  readonly theme: string;
  readonly recent_shots_count: number;
  readonly images: ImageConfig;
}

// ---------------------------------------------------------------------------
// Gallery Configuration
// ---------------------------------------------------------------------------

export interface GalleryEntry {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly listed: boolean;
}

export interface GalleryConfig {
  readonly galleries: readonly GalleryEntry[];
}

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

export interface ExifData {
  readonly date?: Date;
  readonly camera?: string;
  readonly lens?: string;
  readonly gps_lat?: number;
  readonly gps_lon?: number;
}

export interface PhotoMetadata {
  readonly title: string;
  readonly date?: Date;
  readonly camera?: string;
  readonly lens?: string;
  readonly gps_lat?: number;
  readonly gps_lon?: number;
  readonly location: string;
  readonly caption: string;
  readonly tags: readonly string[];
}

export interface ImageVariant {
  readonly width: number;
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
  readonly photos: readonly Photo[];
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
}
