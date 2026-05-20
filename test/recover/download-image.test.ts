import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { downloadImage } from '../../src/recover/download-image.js';

let server: Server;
let baseUrl: string;
let workDir: string;

beforeAll(async () => {
  server = createServer((_, res) => {
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  if (typeof addr === 'string' || addr === null) throw new Error('bad addr');
  baseUrl = `http://127.0.0.1:${String(addr.port)}`;
  workDir = await mkdtemp(resolve(tmpdir(), 'obscura-recover-'));
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await rm(workDir, { recursive: true, force: true });
});

describe('downloadImage', () => {
  it('downloads a binary and writes it to disk', async () => {
    const targetPath = resolve(workDir, 'sample-01.jpg');
    await downloadImage(`${baseUrl}/img.jpg`, targetPath);
    const data = await readFile(targetPath);
    expect(data.length).toBe(4);
    expect(data[0]).toBe(0xff);
    expect(data[3]).toBe(0xd9);
  });
});
