import { resolve } from 'node:path';
import { build } from './build.js';

async function main(): Promise<void> {
  const projectDir = resolve(process.cwd());

  console.log('Obscura — building site…\n');

  try {
    const result = await build(projectDir);

    // Print warnings
    if (result.warnings.length > 0) {
      console.warn('\n⚠ Warnings:\n');
      for (const warning of result.warnings) {
        console.warn(warning);
      }
      console.warn('');
    }

    console.log(
      `✓ Built ${String(result.pageCount)} pages, ${String(result.photoCount)} photos in ${String(result.durationMs)}ms`,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`\n✗ Build failed: ${error.message}`);
      if (error.cause instanceof Error) {
        console.error(`  Caused by: ${error.cause.message}`);
      }
    } else {
      console.error('\n✗ Build failed with an unknown error');
    }
    process.exitCode = 1;
  }
}

void main();
