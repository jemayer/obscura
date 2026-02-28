import type { BlogPost, CrossReferenceGraph } from './types.js';

export function buildCrossReferenceGraph(
  posts: readonly BlogPost[],
): CrossReferenceGraph {
  const photoToPostSlugs = new Map<string, string[]>();
  const postToPhotoSlugs = new Map<string, string[]>();

  for (const post of posts) {
    const uniquePhotos = [...new Set(post.referencedPhotos)];
    postToPhotoSlugs.set(post.slug, uniquePhotos);

    for (const photoSlug of uniquePhotos) {
      const existing = photoToPostSlugs.get(photoSlug);
      if (existing) {
        existing.push(post.slug);
      } else {
        photoToPostSlugs.set(photoSlug, [post.slug]);
      }
    }
  }

  return { photoToPostSlugs, postToPhotoSlugs };
}

export function getBackLinks(
  graph: CrossReferenceGraph,
  photoSlug: string,
): readonly string[] {
  return graph.photoToPostSlugs.get(photoSlug) ?? [];
}

export function getReferencedPhotos(
  graph: CrossReferenceGraph,
  postSlug: string,
): readonly string[] {
  return graph.postToPhotoSlugs.get(postSlug) ?? [];
}
