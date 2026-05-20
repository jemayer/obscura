import { describe, it, expect } from 'vitest';
import { formatReport } from '../../src/recover/report.js';

describe('formatReport', () => {
  it('renders a Markdown report grouped by category', () => {
    const report = formatReport({
      sourceUrl: 'https://example.com',
      identifiedVersion: '0.2.1',
      identifiedTheme: 'editorial',
      buildTimestamp: '20260101-12:00:00',
      counts: { galleries: 1, photos: 3, posts: 1, pages: 2 },
      warnings: [
        {
          category: 'identify',
          subject: 'theme',
          message: 'assumed editorial',
        },
        { category: 'photo', subject: 'sample/sample-02', message: 'no caption' },
        {
          category: 'image',
          subject: 'sample/sample-03',
          message: 'download failed',
        },
      ],
    });
    expect(report).toContain('# Recovery Report');
    expect(report).toContain('https://example.com');
    expect(report).toContain('## Identification');
    expect(report).toContain('## Photos');
    expect(report).toContain('sample/sample-02');
    expect(report).toContain('## Images');
    expect(report).toContain('sample/sample-03');
  });

  it('reports "None" when there are no warnings', () => {
    const report = formatReport({
      sourceUrl: 'https://example.com',
      identifiedTheme: 'editorial',
      identifiedVersion: '0.2.1',
      buildTimestamp: null,
      counts: { galleries: 0, photos: 0, posts: 0, pages: 0 },
      warnings: [],
    });
    expect(report).toContain('None.');
  });
});
