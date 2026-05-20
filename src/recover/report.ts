import type { RecoveryWarning } from './types.js';

export interface ReportInput {
  readonly sourceUrl: string;
  readonly identifiedTheme: string;
  readonly identifiedVersion: string | null;
  readonly buildTimestamp: string | null;
  readonly counts: {
    readonly galleries: number;
    readonly photos: number;
    readonly posts: number;
    readonly pages: number;
  };
  readonly warnings: readonly RecoveryWarning[];
}

const CATEGORY_TITLES: Readonly<Record<RecoveryWarning['category'], string>> = {
  identify: 'Identification',
  site: 'Site config',
  gallery: 'Galleries',
  photo: 'Photos',
  post: 'Posts',
  page: 'Pages',
  image: 'Images',
  sitemap: 'Sitemap',
};

export function formatReport(input: ReportInput): string {
  const lines: string[] = [];
  lines.push('# Recovery Report');
  lines.push('');
  lines.push(`Source: ${input.sourceUrl}`);
  lines.push(`Upstream theme: \`${input.identifiedTheme}\``);
  lines.push(
    `Upstream Obscura version: ${input.identifiedVersion ?? '_(unknown — older site)_'}`,
  );
  if (input.buildTimestamp) {
    lines.push(`Upstream build timestamp: ${input.buildTimestamp}`);
  }
  lines.push('');
  lines.push('## Recovered counts');
  lines.push('');
  lines.push(`- Galleries: ${String(input.counts.galleries)}`);
  lines.push(`- Photos: ${String(input.counts.photos)}`);
  lines.push(`- Posts: ${String(input.counts.posts)}`);
  lines.push(`- Pages: ${String(input.counts.pages)}`);
  lines.push('');

  if (input.warnings.length === 0) {
    lines.push('## Issues');
    lines.push('');
    lines.push('_None. Everything detected was extracted._');
    lines.push('');
    return lines.join('\n');
  }

  const grouped = new Map<RecoveryWarning['category'], RecoveryWarning[]>();
  for (const w of input.warnings) {
    const list = grouped.get(w.category) ?? [];
    list.push(w);
    grouped.set(w.category, list);
  }

  for (const [category, list] of grouped) {
    lines.push(`## ${CATEGORY_TITLES[category]}`);
    lines.push('');
    for (const w of list) {
      lines.push(`- \`${w.subject}\` — ${w.message}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
