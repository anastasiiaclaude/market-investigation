import type { Competitor, FeatureArea } from './competitor';
import { buildComparison } from './gap';
import { ratingToCell } from './rating-cell';

/**
 * Pure mapping from competitive gaps to Jira issue specs (M8, FR-14 — ADR 008).
 * A gap (FR-4, `domain/gap.ts`) is a VA-INDIGO area rated weak/absent where a
 * competitor is stronger; each becomes one Task in the `KAN` project. Lives in
 * `app/src/domain` (node-tested, keeps the all-Zod-in-`app/src` split); the HTTP
 * orchestration is `api/_lib/jira.ts`.
 */

// ── Minimal Atlassian Document Format (ADF) ─────────────────────────────────
// Jira REST v3 requires the description as an ADF document, not a plain string.
// Only the few node types we emit (paragraph, bullet list) are modelled.

export interface AdfNode {
  type: string;
  [key: string]: unknown;
}
export interface AdfDoc {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}

export function adfText(text: string): AdfNode {
  return { type: 'text', text };
}
export function adfParagraph(text: string): AdfNode {
  return { type: 'paragraph', content: [adfText(text)] };
}
export function adfBulletList(items: string[]): AdfNode {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [adfParagraph(item)],
    })),
  };
}
export function adfDoc(...content: AdfNode[]): AdfDoc {
  return { type: 'doc', version: 1, content };
}

// ── Gap → issue mapping ─────────────────────────────────────────────────────

/** Applied to every issue this tool creates, for coarse filtering in Jira. */
export const JIRA_LABEL = 'market-investigation';

/** Deterministic per-gap marker label — the dedup key (one gap area ↔ one issue). */
export function gapMarkerLabel(area: FeatureArea): string {
  return `mi-gap-${area}`;
}

export interface JiraIssueSpec {
  area: FeatureArea;
  summary: string;
  description: AdfDoc;
  labels: string[];
  /** The `mi-gap-<area>` label used to detect an already-created issue. */
  markerLabel: string;
}

/**
 * One `JiraIssueSpec` per gap area, in canonical area order. Non-gap areas are
 * skipped, so an empty result means "no gaps to file". `areas` narrows the set
 * (same subset semantics as `buildComparison`).
 */
export function gapIssueSpecs(
  home: Competitor,
  competitors: Competitor[],
  areas?: readonly FeatureArea[],
): JiraIssueSpec[] {
  const model = buildComparison(home, competitors, areas);

  return model.rows
    .filter((row) => row.home.isGap)
    .map((row) => {
      const homeRating = home.features[row.area];
      const homeSeverity = ratingToCell(homeRating).severity;
      const stronger = competitors
        .filter((c) => ratingToCell(c.features[row.area]).severity > homeSeverity)
        .map((c) => `${c.name} — ${c.features[row.area]}`);
      const markerLabel = gapMarkerLabel(row.area);

      return {
        area: row.area,
        summary: `Close competitive gap: ${row.label}`,
        description: adfDoc(
          adfParagraph(
            `${home.name} is rated "${homeRating}" in ${row.label}, while stronger competitors exist:`,
          ),
          adfBulletList(stronger),
          adfParagraph('Filed automatically from market-investigation gap analysis.'),
        ),
        labels: [JIRA_LABEL, markerLabel],
        markerLabel,
      };
    });
}
