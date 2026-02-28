import { describe, it, expect } from 'vitest';
import { buildCrossReferenceGraph, getBackLinks, getReferencedPhotos } from '../src/crossref.js';
import type { BlogPost } from '../src/types.js';

function makePost(slug: string, referencedPhotos: readonly string[]): BlogPost {
  return {
    slug,
    frontmatter: {
      title: slug,
      date: new Date('2024-01-01'),
      tags: [],
    },
    content: '',
    renderedContent: '',
    referencedPhotos,
  };
}

describe('buildCrossReferenceGraph', () => {
  it('builds correct mappings for a post referencing one photo', () => {
    const posts = [makePost('my-post', ['mono/rain'])];
    const graph = buildCrossReferenceGraph(posts);

    expect(getBackLinks(graph, 'mono/rain')).toEqual(['my-post']);
    expect(getReferencedPhotos(graph, 'my-post')).toEqual(['mono/rain']);
  });

  it('handles a post referencing multiple photos', () => {
    const posts = [makePost('city-walk', ['mono/rain', 'color/sunset'])];
    const graph = buildCrossReferenceGraph(posts);

    expect(getBackLinks(graph, 'mono/rain')).toEqual(['city-walk']);
    expect(getBackLinks(graph, 'color/sunset')).toEqual(['city-walk']);
    expect(getReferencedPhotos(graph, 'city-walk')).toEqual(['mono/rain', 'color/sunset']);
  });

  it('handles multiple posts referencing the same photo', () => {
    const posts = [
      makePost('post-a', ['mono/rain']),
      makePost('post-b', ['mono/rain']),
    ];
    const graph = buildCrossReferenceGraph(posts);

    expect(getBackLinks(graph, 'mono/rain')).toEqual(['post-a', 'post-b']);
  });

  it('returns empty array for photo with no references', () => {
    const posts = [makePost('post', ['mono/rain'])];
    const graph = buildCrossReferenceGraph(posts);

    expect(getBackLinks(graph, 'color/sunset')).toEqual([]);
  });

  it('returns empty array for post with no photos', () => {
    const posts = [makePost('text-only', [])];
    const graph = buildCrossReferenceGraph(posts);

    expect(getReferencedPhotos(graph, 'text-only')).toEqual([]);
  });

  it('handles empty post list', () => {
    const graph = buildCrossReferenceGraph([]);
    expect(getBackLinks(graph, 'any')).toEqual([]);
  });
});
