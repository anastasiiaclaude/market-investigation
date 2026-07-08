import { z } from 'zod';
import type { Competitor, FeatureArea } from './competitor';
import { FEATURE_AREA_LABELS } from './competitor';
import { buildComparison, gapAreas } from './gap';

/**
 * Pure builder for the Confluence comparison page (M8, FR-15 — ADR 008). Turns
 * `home` + competitors into a **storage-format** (XHTML) body: an intro, the
 * comparison table (areas × [VA-INDIGO + competitors], gap cells flagged), and a
 * gaps list. Lives in `app/src/domain` (node-tested, all-Zod-in-`app/src`); the
 * HTTP publish is `api/_lib/confluence.ts`.
 */

/** The one page this tool owns — its title is the create-or-update dedup key. */
export const COMPARISON_PAGE_TITLE = 'VA-INDIGO — Competitive comparison';

/** Escape text for safe interpolation into XHTML/storage markup. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(cells: string[], header = false): string {
  const tag = header ? 'th' : 'td';
  return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
}

/**
 * The storage-format body. Ratings come from a fixed set (safe), but competitor
 * names are user/research data, so every interpolated name is XML-escaped.
 */
export function comparisonStorage(
  home: Competitor,
  competitors: Competitor[],
  areas?: readonly FeatureArea[],
): string {
  const model = buildComparison(home, competitors, areas);

  const header = row(
    ['Feature area', `${escapeXml(home.name)} (VA-INDIGO)`, ...competitors.map((c) => escapeXml(c.name))],
    true,
  );
  const body = model.rows
    .map((r) =>
      row([
        escapeXml(r.label),
        `${r.home.cell.label}${r.home.isGap ? ' ⚠ gap' : ''}`,
        ...r.competitors.map((cell) => cell.label),
      ]),
    )
    .join('');
  const table = `<table><tbody>${header}${body}</tbody></table>`;

  const gaps = gapAreas(home, competitors, areas);
  const gapsSection =
    gaps.length > 0
      ? `<h2>Gaps</h2><ul>${gaps
          .map((a) => `<li>${escapeXml(FEATURE_AREA_LABELS[a])}</li>`)
          .join('')}</ul>`
      : `<h2>Gaps</h2><p>No gaps — VA-INDIGO leads or matches on every area.</p>`;

  const intro =
    `<p>How <strong>${escapeXml(home.name)}</strong> compares against ${competitors.length} ` +
    `competitor(s). Cells flagged <strong>⚠ gap</strong> mark where VA-INDIGO is weak or ` +
    `absent and a competitor is stronger.</p>`;

  return `${intro}${table}${gapsSection}`;
}

/** Title + storage body for the canonical comparison page. */
export function comparisonPage(
  home: Competitor,
  competitors: Competitor[],
): { title: string; storage: string } {
  return { title: COMPARISON_PAGE_TITLE, storage: comparisonStorage(home, competitors) };
}

// ── Publish result (shared shape) ───────────────────────────────────────────
// Single source of truth for `POST /api/confluence`'s response, validated by the
// client (keeps the all-Zod-in-`app/src` invariant), mirroring `jiraSyncResultSchema`.

export const confluencePublishResultSchema = z.object({
  pageId: z.string(),
  url: z.string(),
  action: z.enum(['created', 'updated']),
});
export type ConfluencePublishResult = z.infer<typeof confluencePublishResultSchema>;
