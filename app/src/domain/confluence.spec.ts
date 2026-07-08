import { describe, it, expect } from 'vitest';
import {
  comparisonStorage,
  comparisonPage,
  escapeXml,
  COMPARISON_PAGE_TITLE,
} from './confluence';
import type { Competitor, FeatureArea, Rating } from './competitor';
import { FEATURE_AREAS } from './competitor';

function make(name: string, ratings: Partial<Record<FeatureArea, Rating>>, fallback: Rating = 'adequate'): Competitor {
  const features = Object.fromEntries(FEATURE_AREAS.map((a) => [a, ratings[a] ?? fallback])) as Record<FeatureArea, Rating>;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return { id: `${slug}.example.com`, name, website: `https://${slug}.example.com/`, description: '', features, updatedAt: '2026-07-08T00:00:00.000Z' };
}

const home = make('VA-INDIGO Analysis Suite', { 'quality-analytics': 'weak', alerting: 'absent' }, 'strong');
const rival = make('Rival A', { 'quality-analytics': 'strong', alerting: 'adequate' });

describe('escapeXml', () => {
  it('escapes the five XML metacharacters', () => {
    expect(escapeXml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('comparisonStorage', () => {
  const storage = comparisonStorage(home, [rival]);

  it('renders a header cell for VA-INDIGO and each competitor', () => {
    expect(storage).toContain('<th>Feature area</th>');
    expect(storage).toContain('Rival A');
    expect(storage).toContain('(VA-INDIGO)');
  });

  it('renders one row per feature area with rating text', () => {
    expect(storage).toContain('Process &amp; quality analytics'); // label is XML-escaped
    expect(storage).toContain('<td>Strong</td>');
  });

  it('flags VA-INDIGO gap cells', () => {
    expect(storage).toContain('⚠ gap');
  });

  it('lists the gap areas in a Gaps section', () => {
    expect(storage).toContain('<h2>Gaps</h2>');
    expect(storage).toContain('<li>Process &amp; quality analytics</li>');
    expect(storage).toContain('<li>Alerting &amp; notifications</li>');
  });

  it('escapes competitor names', () => {
    const evil = make('<script>', {}, 'weak');
    expect(comparisonStorage(home, [evil])).toContain('&lt;script&gt;');
    expect(comparisonStorage(home, [evil])).not.toContain('<script>');
  });

  it('shows a no-gaps message when VA-INDIGO leads everywhere', () => {
    const strongHome = make('VA-INDIGO', {}, 'strong');
    const weakRival = make('Weak', {}, 'weak');
    expect(comparisonStorage(strongHome, [weakRival])).toContain('No gaps');
  });
});

describe('comparisonPage', () => {
  it('uses the canonical title and a storage body', () => {
    const page = comparisonPage(home, [rival]);
    expect(page.title).toBe(COMPARISON_PAGE_TITLE);
    expect(page.storage).toBe(comparisonStorage(home, [rival]));
  });
});
