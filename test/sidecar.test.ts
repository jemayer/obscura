import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { generateSidecars } from '../src/sidecar.js';

describe('generateSidecars', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'obscura-sidecar-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('sets default title to "Untitled" in generated sidecar', async () => {
    // Create a minimal JPEG file (just enough bytes for exiftool/sharp to not crash)
    const jpegPath = resolve(tempDir, 'photo.jpg');
    // Minimal JPEG: SOI marker + EOI marker
    const minimalJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0x00, 0x00, 0xff, 0xd9]);
    await writeFile(jpegPath, minimalJpeg);

    const result = await generateSidecars(tempDir);
    expect(result.generated).toHaveLength(1);

    const sidecarPath = resolve(tempDir, 'photo.yaml');
    const content = await readFile(sidecarPath, 'utf-8');
    expect(content).toContain('title: Untitled');
  });
});
