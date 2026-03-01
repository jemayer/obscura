import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import chokidar from 'chokidar';
import { build } from './build.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function main(): Promise<void> {
  const projectDir = resolve(process.cwd());
  const distDir = resolve(projectDir, 'dist');
  const port = 3000;

  // Initial build
  console.log('Obscura dev — initial build…\n');
  try {
    const result = await build(projectDir);
    console.log(
      `✓ Built ${String(result.pageCount)} pages in ${String(result.durationMs)}ms\n`,
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    console.error(`✗ Initial build failed: ${msg}\n`);
  }

  // Watch for changes
  let rebuilding = false;

  const watcher = chokidar.watch(
    [
      resolve(projectDir, 'content'),
      resolve(projectDir, 'config'),
      resolve(projectDir, 'themes'),
    ],
    {
      ignoreInitial: true,
      ignored: /(^|[\\/])\../,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
  );

  const rebuild = async (changedPath: string): Promise<void> => {
    if (rebuilding) return;
    rebuilding = true;
    console.log(`\n↻ Change detected: ${changedPath}`);
    try {
      const result = await build(projectDir);
      console.log(
        `✓ Rebuilt ${String(result.pageCount)} pages in ${String(result.durationMs)}ms`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      console.error(`✗ Rebuild failed: ${msg}`);
    }
    rebuilding = false;
  };

  watcher.on('change', (path) => void rebuild(path));
  watcher.on('add', (path) => void rebuild(path));
  watcher.on('unlink', (path) => void rebuild(path));

  // Static file server
  const server = createServer((req, res) => {
    const url = req.url ?? '/';
    let filePath = resolve(distDir, url === '/' ? 'index.html' : `.${url}`);

    // Try index.html for directory paths
    if (!extname(filePath)) {
      filePath = filePath.endsWith('/')
        ? resolve(filePath, 'index.html')
        : `${filePath}/index.html`;
    }

    void (async () => {
      try {
        const info = await stat(filePath);
        if (!info.isFile()) throw new Error('Not a file');

        const content = await readFile(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch {
        // Serve 404.html
        try {
          const notFound = await readFile(resolve(distDir, '404.html'));
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(notFound);
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      }
    })();
  });

  server.listen(port, () => {
    console.log(`⦿ Serving at http://localhost:${String(port)}/`);
    console.log('  Watching for changes… (Ctrl+C to stop)\n');
  });
}

void main();
