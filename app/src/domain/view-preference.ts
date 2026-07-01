/**
 * The two comparison views and the localStorage persistence for the choice.
 * Pure logic (parse + default) kept out of the React hook so it is node-testable
 * without jsdom. Traces to FR-3.
 */
export const VIEWS = ['table', 'cards'] as const;
export type View = (typeof VIEWS)[number];

export const DEFAULT_VIEW: View = 'table';
export const VIEW_STORAGE_KEY = 'mi.view';

/** Narrow an unknown stored string to a `View`, defaulting when unrecognised. */
export function parseView(raw: string | null): View {
  return VIEWS.includes(raw as View) ? (raw as View) : DEFAULT_VIEW;
}

/** Read the persisted view (or the default) from an injected storage. */
export function loadView(storage: Pick<Storage, 'getItem'>): View {
  return parseView(storage.getItem(VIEW_STORAGE_KEY));
}

/** Persist the chosen view to an injected storage. */
export function saveView(storage: Pick<Storage, 'setItem'>, view: View): void {
  storage.setItem(VIEW_STORAGE_KEY, view);
}
