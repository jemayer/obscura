import { readFile, cp, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface ThemeManifest {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author?: string;
}

function isThemeManifest(value: unknown): value is ThemeManifest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['name'] === 'string' &&
    typeof obj['description'] === 'string' &&
    typeof obj['version'] === 'string'
  );
}

export interface Theme {
  readonly manifest: ThemeManifest;
  readonly dir: string;
  readonly templatesDir: string;
  readonly assetsDir: string;
}

export async function loadTheme(
  themesDirs: readonly string[],
  themeName: string,
): Promise<Theme> {
  let themeDir: string | undefined;
  for (const dir of themesDirs) {
    const candidate = resolve(dir, themeName);
    try {
      await access(candidate);
      themeDir = candidate;
      break;
    } catch {
      // Not found in this directory, try next
    }
  }

  if (!themeDir) {
    const searched = themesDirs.map((d) => resolve(d, themeName)).join('\n  ');
    throw new Error(
      `Theme "${themeName}" not found. Searched:\n  ${searched}\nCheck the "theme" setting in site/config/site.yaml.`,
    );
  }

  const manifestPath = resolve(themeDir, 'manifest.yaml');
  let manifest: ThemeManifest;

  try {
    const content = await readFile(manifestPath, 'utf-8');
    const parsed: unknown = parseYaml(content);
    if (!isThemeManifest(parsed)) {
      throw new Error(`Invalid theme manifest at ${manifestPath}`);
    }
    manifest = parsed;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid theme')) {
      throw error;
    }
    throw new Error(
      `Could not read theme manifest at ${manifestPath}. Every theme must have a manifest.yaml.`,
      { cause: error },
    );
  }

  return {
    manifest,
    dir: themeDir,
    templatesDir: resolve(themeDir, 'templates'),
    assetsDir: resolve(themeDir, 'assets'),
  };
}

export async function copyThemeAssets(
  theme: Theme,
  distDir: string,
): Promise<void> {
  const destDir = resolve(distDir, 'assets', 'theme');

  try {
    await access(theme.assetsDir);
  } catch {
    // No assets directory — that's fine
    return;
  }

  await cp(theme.assetsDir, destDir, { recursive: true });
}
