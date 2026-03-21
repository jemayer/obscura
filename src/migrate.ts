import { existsSync } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const oldConfigDir = resolve(projectRoot, 'config');
const oldContentDir = resolve(projectRoot, 'content');
const siteDir = resolve(projectRoot, 'site');
const newConfigDir = resolve(siteDir, 'config');
const newContentDir = resolve(siteDir, 'content');

async function main(): Promise<void> {
  const hasOldConfig = existsSync(resolve(oldConfigDir, 'site.yaml'));
  const hasNewConfig = existsSync(resolve(newConfigDir, 'site.yaml'));

  if (hasNewConfig) {
    console.log('Already using the new site/ layout. Nothing to do.');
    return;
  }

  if (!hasOldConfig) {
    console.log(
      'No site found at config/site.yaml or site/config/site.yaml.\n' +
        'Run "npm run init" to create a new site.',
    );
    return;
  }

  console.log('Migrating to the new site/ directory layout…\n');

  await mkdir(siteDir, { recursive: true });

  if (existsSync(oldConfigDir)) {
    await rename(oldConfigDir, newConfigDir);
    console.log('  config/ → site/config/');
  }

  if (existsSync(oldContentDir)) {
    await rename(oldContentDir, newContentDir);
    console.log('  content/ → site/content/');
  }

  console.log('');
  console.log('Done! Your site content is now under site/.');
  console.log('');
  console.log('If you have custom scripts or CI pipelines that reference');
  console.log('config/ or content/, update them to use site/config/ and');
  console.log('site/content/ instead.');
  console.log('');
  console.log('Custom themes can now go in site/themes/ — they will take');
  console.log('priority over built-in themes in themes/.');
  console.log('');
}

void main();
