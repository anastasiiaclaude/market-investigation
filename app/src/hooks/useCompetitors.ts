import { useCallback, useEffect, useState } from 'react';
import { fetchCompetitors } from '../domain/competitors-api';
import { MOCK_COMPETITORS } from '../mocks/competitors';
import type { Competitor } from '../domain/competitor';

/**
 * Load the persisted competitor list from the API (M6 Part B). Thin glue over
 * the pure `fetchCompetitors`: it owns the fetch/validate logic, this hook only
 * wires it to React state. Untested by design (the project runs node-only specs,
 * no jsdom) — the coverage lives in `competitors-api.spec.ts`, mirroring
 * `useViewPreference`.
 *
 * On any fetch failure it falls back to `MOCK_COMPETITORS` so `npm run dev`
 * (vite-only — `/api` isn't served locally) still renders; the caller surfaces a
 * "sample data" banner. A successful empty response stays empty (a valid state,
 * not a fallback). Returns the rival list only — VA-INDIGO is pinned by the caller.
 *
 * `upsert` merges a saved competitor into the list (replace-by-id, else append)
 * so the M7 form can re-render after a write without a full refetch. It keeps the
 * fallback flag intact, so an optimistic save also shows against the mock list.
 */
export type CompetitorsState =
  | { status: 'loading' }
  | { status: 'ready'; competitors: Competitor[] }
  | { status: 'fallback'; competitors: Competitor[]; error: string };

export interface UseCompetitors {
  state: CompetitorsState;
  upsert: (competitor: Competitor) => void;
}

function mergeById(list: Competitor[], competitor: Competitor): Competitor[] {
  const idx = list.findIndex((c) => c.id === competitor.id);
  if (idx === -1) return [...list, competitor];
  return list.map((c, i) => (i === idx ? competitor : c));
}

export function useCompetitors(): UseCompetitors {
  const [state, setState] = useState<CompetitorsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchCompetitors()
      .then((competitors) => {
        if (!cancelled) setState({ status: 'ready', competitors });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'fallback',
            competitors: MOCK_COMPETITORS,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upsert = useCallback((competitor: Competitor) => {
    setState((prev) => {
      const current = prev.status === 'loading' ? [] : prev.competitors;
      const competitors = mergeById(current, competitor);
      // Preserve a fallback so its banner stays; otherwise it's a ready list.
      return prev.status === 'fallback'
        ? { ...prev, competitors }
        : { status: 'ready', competitors };
    });
  }, []);

  return { state, upsert };
}
