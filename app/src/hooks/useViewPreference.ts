import { useEffect, useState } from 'react';
import { loadView, saveView, type View } from '../domain/view-preference';

/**
 * View state persisted to localStorage. Thin glue over the pure
 * `view-preference` module: it owns the parse/default/persist logic; this hook
 * only wires it to React state and `window.localStorage`. FR-3.
 */
export function useViewPreference(): [View, (view: View) => void] {
  const [view, setView] = useState<View>(() => loadView(window.localStorage));

  useEffect(() => {
    saveView(window.localStorage, view);
  }, [view]);

  return [view, setView];
}
