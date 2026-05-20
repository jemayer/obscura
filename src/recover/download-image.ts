import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fetchBuffer } from './fetch.js';

export async function downloadImage(
  url: string,
  destPath: string,
): Promise<void> {
  const buf = await fetchBuffer(url);
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
}
