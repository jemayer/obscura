import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
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

  it.each([
    ['2026:11:24 10:23:00', '-05:00'],
    ['2026-11-24 15:23:00 UTC', '+00:00'],
  ])('writes the full EXIF capture instant for %s', async (date, offset) => {
    await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#888888' },
    })
      .withExif({ IFD2: { DateTimeOriginal: date, OffsetTimeOriginal: offset } })
      .jpeg()
      .toFile(resolve(tempDir, 'photo.jpg'));

    await generateSidecars(tempDir);

    const content = await readFile(resolve(tempDir, 'photo.yaml'), 'utf-8');
    expect(content).toContain('date: 2026-11-24T15:23:00.000Z');
  });
});
