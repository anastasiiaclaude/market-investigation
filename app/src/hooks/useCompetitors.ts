import { useCallback, useEffect, useState } from 'react';
import { fetchCompetitors } from '../domain/competitors-api';
import { ApiError } from '../domain/api-error';
import { MOCK_COMPETITORS } from '../mocks/competitors';
import type { Competitor } from '../domain/competitor';

/**
 * Load the persisted competitor list from the API (M6 Part B). Thin glue over
 * the pure `fetchCompetitors`: it owns the fetch/validate logic, this hook only
 * wires it to React state. Untested by design (the project runs node-only specs,
 * no jsdom) — the coverage lives in `competitors-api.spec.ts`, mirroring
 * `useViewPreference`.
 *
 * Failure is classified by type (M8, FR-16): a real server error arrives as an
 * `ApiError` (non-OK status) → an `error` state the caller shows with a **Retry**.
 * Any other throw — a parse/shape failure, the vite-dev signature where `/api`
 * serves `index.html`, or an offline `fetch` reject — → the mock `fallback` +
 * "sample data" banner, so `npm run dev` still renders. A successful empty
 * response stays empty (a valid state). Returns rivals only — VA-INDIGO is pinned
 * by the caller.
 *
 * `reload` re-runs the load (the Retry affordance). `upsert` merges a saved
 * competitor into the list (replace-by-id, else append) so the M7 form / M8
 * research can re-render after a write without a full refetch, keeping a fallback
 * banner intact.
 */
export type CompetitorsState =
  | { status: 'loading' }
  | { status: 'ready'; competitors: Competitor[] }
  | { status: 'error'; error: string }
  | { status: 'fallback'; competitors: Competitor[]; error: string };

export interface UseCompetitors {
  state: CompetitorsState;
  upsert: (competitor: Competitor) => void;
  reload: () => void;
}

function mergeById(list: Competitor[], competitor: Competitor): Competitor[] {
  const idx = list.findIndex((c) => c.id === competitor.id);
  if (idx === -1) return [...list, competitor];
  return list.map((c, i) => (i === idx ? competitor : c));
}

export function useCompetitors(): UseCompetitors {
  const [state, setState] = useState<CompetitorsState>({ status: 'loading' });

  // Run one fetch and resolve it into ready / error / fallback. Only sets state
  // from the async result (never synchronously), so it is safe to call from an
  // effect; `token.cancelled` drops a result after unmount / a superseding call.
  const run = useCallback((token: { cancelled: boolean }) => {
    fetchCompetitors()
      .then((competitors) => {
        if (!token.cancelled) setState({ status: 'ready', competitors });
      })
      .catch((error: unknown) => {
        if (token.cancelled) return;
        if (error instanceof ApiError) {
          setState({ status: 'error', error: error.message });
        } else {
          setState({
            status: 'fallback',
            competitors: MOCK_COMPETITORS,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
  }, []);

  useEffect(() => {
    const token = { cancelled: false };
    run(token);
    return () => {
      token.cancelled = true;
    };
  }, [run]);

  // Retry affordance: reset to loading (an event handler, not an effect) and refetch.
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    run({ cancelled: false });
  }, [run]);

  const upsert = useCallback((competitor: Competitor) => {
    setState((prev) => {
      const current = 'competitors' in prev ? prev.competitors : [];
      const competitors = mergeById(current, competitor);
      // Preserve a fallback so its banner stays; otherwise it's a ready list.
      return prev.status === 'fallback'
        ? { ...prev, competitors }
        : { status: 'ready', competitors };
    });
  }, []);

  return { state, upsert, reload };
}
