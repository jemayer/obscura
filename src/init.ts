import { existsSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const exampleDir = resolve(projectRoot, 'examples', 'default-site');
const configTarget = resolve(projectRoot, 'config');
const contentTarget = resolve(projectRoot, 'content');

async function main(): Promise<void> {
  if (existsSync(resolve(configTarget, 'site.yaml'))) {
    console.error(
      'Error: config/site.yaml already exists. Aborting to avoid overwriting your content.',
    );
    console.error(
      'If you want to re-initialise, remove config/ and content/ first.',
    );
    process.exit(1);
  }

  if (!existsSync(exampleDir)) {
    console.error(
      'Error: examples/default-site/ not found. Are you in the Obscura project root?',
    );
    process.exit(1);
  }

  console.log('Copying example site into config/ and content/...');

  await cp(resolve(exampleDir, 'config'), configTarget, { recursive: true });
  await cp(resolve(exampleDir, 'content'), contentTarget, { recursive: true });

  console.log('');
  console.log('Done! Your site is ready. Next steps:');
  console.log('');
  console.log('  1. npm run build     — build the site with example content');
  console.log('  2. npm run dev       — preview at http://localhost:3000');
  console.log('  3. Edit config/site.yaml to set your site title and URL');
  console.log('  4. Replace the sample gallery with your own photos');
  console.log('');
}

void main();
