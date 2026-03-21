import { existsSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const exampleDir = resolve(projectRoot, 'examples', 'default-site', 'site');
const siteTarget = resolve(projectRoot, 'site');

async function main(): Promise<void> {
  if (existsSync(resolve(siteTarget, 'config', 'site.yaml'))) {
    console.error(
      'Error: site/config/site.yaml already exists. Aborting to avoid overwriting your content.',
    );
    console.error(
      'If you want to re-initialise, remove the site/ directory first.',
    );
    process.exit(1);
  }

  if (!existsSync(exampleDir)) {
    console.error(
      'Error: examples/default-site/site/ not found. Are you in the Obscura project root?',
    );
    process.exit(1);
  }

  console.log('Copying example site into site/...');

  await cp(exampleDir, siteTarget, { recursive: true });

  console.log('');
  console.log('Done! Your site is ready.');
  console.log('Everything under site/ is yours — edit freely.');
  console.log('');
  console.log('Next steps:');
  console.log('');
  console.log('  1. npm run build     — build the site with example content');
  console.log('  2. npm run dev       — preview at http://localhost:3000');
  console.log('  3. Edit site/config/site.yaml to set your site title and URL');
  console.log('  4. Replace the sample gallery with your own photos');
  console.log('');
}

void main();
