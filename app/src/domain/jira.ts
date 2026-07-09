import { z } from 'zod';
import type { Competitor, FeatureArea } from './competitor.js';
import { buildComparison, strongerCompetitors } from './gap.js';

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
      const stronger = strongerCompetitors(row.area, home, competitors).map(
        (c) => `${c.name} — ${c.features[row.area]}`,
      );
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

// ── Sync result (shared shape) ──────────────────────────────────────────────
// The single source of truth for `POST /api/jira`'s response: `api/_lib/jira.ts`
// builds it, the client (`competitors-api.ts`) validates the reply against it,
// keeping the all-Zod-in-`app/src` invariant.

const gapRefSchema = z.object({ area: z.string(), key: z.string() });
export const jiraSyncResultSchema = z.object({
  created: z.array(gapRefSchema),
  skipped: z.array(gapRefSchema),
});
export type JiraSyncResult = z.infer<typeof jiraSyncResultSchema>;

/** Human summary of a sync ("Created KAN-1, KAN-2 · 1 already existed"). */
export function summarizeJiraSync(result: JiraSyncResult): string {
  const parts: string[] = [];
  if (result.created.length > 0) {
    parts.push(`Created ${result.created.map((c) => c.key).join(', ')}`);
  }
  if (result.skipped.length > 0) {
    parts.push(`${result.skipped.length} already existed`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'No gaps to file.';
}
