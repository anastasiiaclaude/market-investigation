import { describe, it, expect } from 'vitest';
import { gapIssueSpecs, gapMarkerLabel, summarizeJiraSync, JIRA_LABEL } from './jira';
import type { Competitor, FeatureArea, Rating } from './competitor';
import { FEATURE_AREAS } from './competitor';

/** Build a competitor with per-area ratings, defaulting unspecified areas. */
function make(
  name: string,
  ratings: Partial<Record<FeatureArea, Rating>>,
  fallback: Rating = 'adequate',
): Competitor {
  const features = Object.fromEntries(
    FEATURE_AREAS.map((a) => [a, ratings[a] ?? fallback]),
  ) as Record<FeatureArea, Rating>;
  return {
    id: `${name}.example`,
    name,
    website: `https://${name}.example/`,
    description: '',
    features,
    updatedAt: '2026-07-08T00:00:00.000Z',
  };
}

// VA-INDIGO: gap in quality-analytics (weak) + alerting (absent); reporting weak
// but no competitor beats it → not a gap; the rest strong/adequate.
const home = make('VA-INDIGO', {
  'realtime-dashboards': 'strong',
  'data-integration': 'adequate',
  'trend-analytics': 'strong',
  'quality-analytics': 'weak',
  alerting: 'absent',
  reporting: 'weak',
});

const rivalA = make('Rival A', {
  'quality-analytics': 'strong', // beats home weak → gap
  alerting: 'adequate', // beats home absent → gap
  reporting: 'absent', // does NOT beat home weak
});
const rivalB = make('Rival B', {
  'quality-analytics': 'adequate',
  alerting: 'weak',
  reporting: 'weak',
});

describe('gapIssueSpecs', () => {
  it('produces one spec per gap area, in canonical order', () => {
    const specs = gapIssueSpecs(home, [rivalA, rivalB]);
    expect(specs.map((s) => s.area)).toEqual(['quality-analytics', 'alerting']);
  });

  it('labels each spec with the shared + marker labels', () => {
    const specs = gapIssueSpecs(home, [rivalA, rivalB]);
    const alerting = specs.find((s) => s.area === 'alerting')!;
    expect(alerting.markerLabel).toBe('mi-gap-alerting');
    expect(alerting.markerLabel).toBe(gapMarkerLabel('alerting'));
    expect(alerting.labels).toEqual([JIRA_LABEL, 'mi-gap-alerting']);
  });

  it('names the area in the summary and the stronger competitors in the ADF', () => {
    const specs = gapIssueSpecs(home, [rivalA, rivalB]);
    const qa = specs.find((s) => s.area === 'quality-analytics')!;
    expect(qa.summary).toBe('Close competitive gap: Process & quality analytics');

    // The bullet list lists only the competitors that beat home in this area.
    const bulletList = qa.description.content.find((n) => n.type === 'bulletList')!;
    const text = JSON.stringify(bulletList);
    expect(text).toContain('Rival A — strong');
    expect(text).toContain('Rival B — adequate');
  });

  it('emits a well-formed ADF doc', () => {
    const [spec] = gapIssueSpecs(home, [rivalA]);
    expect(spec!.description.type).toBe('doc');
    expect(spec!.description.version).toBe(1);
    expect(spec!.description.content.length).toBeGreaterThan(0);
  });

  it('does not file a gap for a weak area no competitor beats', () => {
    const specs = gapIssueSpecs(home, [rivalA, rivalB]);
    expect(specs.some((s) => s.area === 'reporting')).toBe(false);
  });

  it('returns no specs when there are no gaps', () => {
    const strongHome = make('VA-INDIGO', {}, 'strong');
    expect(gapIssueSpecs(strongHome, [rivalA, rivalB])).toEqual([]);
  });
});

describe('summarizeJiraSync', () => {
  it('lists created keys', () => {
    expect(
      summarizeJiraSync({ created: [{ area: 'alerting', key: 'KAN-1' }], skipped: [] }),
    ).toBe('Created KAN-1');
  });

  it('combines created and skipped', () => {
    expect(
      summarizeJiraSync({
        created: [{ area: 'alerting', key: 'KAN-1' }],
        skipped: [{ area: 'reporting', key: 'KAN-2' }],
      }),
    ).toBe('Created KAN-1 · 1 already existed');
  });

  it('reports skipped-only', () => {
    expect(summarizeJiraSync({ created: [], skipped: [{ area: 'alerting', key: 'KAN-2' }] })).toBe(
      '1 already existed',
    );
  });

  it('falls back when nothing happened', () => {
    expect(summarizeJiraSync({ created: [], skipped: [] })).toBe('No gaps to file.');
  });
});
