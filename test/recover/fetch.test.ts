import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { fetchText, fetchBuffer } from '../../src/recover/fetch.js';

let server: Server;
let baseUrl: string;
let flake = 0;

beforeAll(async () => {
  flake = 0;
  server = createServer((req, res) => {
    if (req.url === '/ok') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html>ok</html>');
    } else if (req.url === '/flake') {
      flake++;
      if (flake < 3) {
        res.writeHead(500);
        res.end('boom');
      } else {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html>recovered</html>');
      }
    } else if (req.url === '/binary') {
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    } else {
      res.writeHead(404);
      res.end('nope');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  if (typeof addr === 'string' || addr === null) throw new Error('bad addr');
  baseUrl = `http://127.0.0.1:${String(addr.port)}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

describe('fetchText', () => {
  it('returns body for 200 OK', async () => {
    const body = await fetchText(`${baseUrl}/ok`);
    expect(body).toContain('ok');
  });

  it('retries on 5xx and succeeds', async () => {
    const body = await fetchText(`${baseUrl}/flake`, {
      retries: 3,
      retryDelayMs: 1,
    });
    expect(body).toContain('recovered');
    expect(flake).toBe(3);
  });

  it('throws on 404 (no retry on 4xx)', async () => {
    await expect(fetchText(`${baseUrl}/missing`)).rejects.toThrow(/404/u);
  });
});

describe('fetchBuffer', () => {
  it('returns binary content', async () => {
    const buf = await fetchBuffer(`${baseUrl}/binary`);
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(0xff);
  });
});
